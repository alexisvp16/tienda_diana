const db = require('../config/db');

// Generador de número correlativo de ticket
const generateTicketNumber = async (conn, channel = 'physical') => {
    const prefix = channel === 'ecommerce' ? 'WEB' : 'T001';
    await conn.query(
        'INSERT IGNORE INTO ticket_sequences (sequence_key, last_number) VALUES (?, 0)',
        [prefix]
    );

    const [rows] = await conn.query(
        'SELECT last_number FROM ticket_sequences WHERE sequence_key = ? FOR UPDATE',
        [prefix]
    );

    const nextNumber = Number(rows[0].last_number) + 1;
    await conn.query(
        'UPDATE ticket_sequences SET last_number = ? WHERE sequence_key = ?',
        [nextNumber, prefix]
    );

    const paddedNumber = String(nextNumber).padStart(8, '0');
    return `${prefix}-${paddedNumber}`;
};

// Registrar nueva venta (Transacción Atómica con control estricto de Stock y Kardex)
const createSale = async (req, res) => {
    const {
        cash_shift_id,
        customer_name = 'Cliente General',
        customer_document = null,
        items,
        discount = 0,
        payment_method = 'cash',
        payment_details = null,
        channel = 'physical'
    } = req.body;

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const validChannels = ['physical', 'ecommerce'];

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'El carrito de venta está vacío.'
        });
    }

    if (items.length > 100 || !validChannels.includes(channel)) {
        return res.status(400).json({ success: false, message: 'Datos de venta no válidos.' });
    }

    if (channel === 'ecommerce' && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Solo administración puede registrar ventas de e-commerce.' });
    }

    if (typeof customer_name !== 'string' || customer_name.trim().length === 0 || customer_name.trim().length > 150) {
        return res.status(400).json({ success: false, message: 'El nombre del cliente no es válido.' });
    }

    const validPayments = ['cash', 'card', 'transfer', 'mixed'];
    if (!validPayments.includes(payment_method)) {
        return res.status(400).json({
            success: false,
            message: `Método de pago inválido. Permitidos: ${validPayments.join(', ')}.`
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        let resolvedShiftId = cash_shift_id;

        // Si es venta física, verificar que exista turno de caja abierto
        if (channel === 'physical') {
            if (!resolvedShiftId) {
                // Buscar si el usuario actual tiene un turno abierto
                const [shifts] = await conn.query(
                    'SELECT id FROM cash_shifts WHERE user_id = ? AND status = "open" ORDER BY id DESC LIMIT 1',
                    [userId]
                );
                if (shifts.length === 0) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Debe abrir su propio turno de caja antes de registrar ventas físicas.'
                    });

                    // Si no tiene turno propio, buscar cualquier turno de caja abierto
                    const [anyShift] = await conn.query(
                        'SELECT id FROM cash_shifts WHERE status = "open" ORDER BY id DESC LIMIT 1'
                    );
                    if (anyShift.length === 0) {
                        await conn.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'No hay un turno de caja abierto. Debe abrir caja antes de registrar ventas físicas.'
                        });
                    }
                    resolvedShiftId = anyShift[0].id;
                } else {
                    resolvedShiftId = shifts[0].id;
                }
            } else {
                const [checkShift] = await conn.query(
                    'SELECT id, status FROM cash_shifts WHERE id = ? AND status = "open" AND (user_id = ? OR ? = TRUE)',
                    [resolvedShiftId, userId, isAdmin]
                );
                if (checkShift.length === 0) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'El turno de caja indicado no existe o está cerrado.'
                    });
                }
            }
        }

        // Generar número correlativo
        const ticketNumber = await generateTicketNumber(conn, channel);

        // Procesar variantes y validar inventario en tiempo real
        let calculatedSubtotal = 0;
        const processedItems = [];
        const seenVariantIds = new Set();

        for (const item of items) {
            const variantId = item.variant_id;
            const quantity = parseInt(item.quantity, 10);
            const itemDiscount = parseFloat(item.discount || 0);

            if (!Number.isInteger(Number(variantId)) || isNaN(quantity) || quantity <= 0 || quantity > 1000 || !Number.isFinite(itemDiscount) || itemDiscount < 0) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Cada ítem debe contener variant_id y cantidad válida mayor a 0.'
                });
            }

            if (seenVariantIds.has(Number(variantId))) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Una variante solo puede aparecer una vez en cada venta.'
                });
            }
            seenVariantIds.add(Number(variantId));

            // Consultar variante bloqueando fila para atomicidad
            const [variants] = await conn.query(`
                SELECT pv.id, pv.product_id, pv.size, pv.color, pv.sku, pv.sale_price, pv.stock,
                       p.name AS product_name
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.id = ? FOR UPDATE
            `, [variantId]);

            if (variants.length === 0) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    message: `La prenda con variante ID ${variantId} no existe.`
                });
            }

            const variant = variants[0];

            if (variant.stock < quantity) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Stock insuficiente para '${variant.product_name}' (${variant.size} - ${variant.color}). Stock actual: ${variant.stock}, Solicitado: ${quantity}.`
                });
            }

            const unitPrice = parseFloat(variant.sale_price);
            const maximumItemDiscount = unitPrice * quantity;
            if (itemDiscount > maximumItemDiscount) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El descuento de una prenda no puede superar su importe.'
                });
            }
            const lineSubtotal = (unitPrice * quantity) - itemDiscount;

            calculatedSubtotal += lineSubtotal;

            processedItems.push({
                variant,
                quantity,
                unitPrice,
                itemDiscount,
                lineSubtotal
            });
        }

        const globalDiscount = parseFloat(discount || 0);
        if (!Number.isFinite(globalDiscount) || globalDiscount < 0 || globalDiscount > calculatedSubtotal) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: 'El descuento global no es válido.'
            });
        }
        const calculatedTotal = calculatedSubtotal - globalDiscount;

        // 1. Insertar venta
        const [saleResult] = await conn.query(`
            INSERT INTO sales (
                ticket_number, cash_shift_id, user_id, customer_name, customer_document,
                subtotal, discount, total, payment_method, payment_details, status, channel
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
        `, [
            ticketNumber,
            resolvedShiftId || null,
            userId,
            customer_name.trim(),
            customer_document ? customer_document.trim() : null,
            calculatedSubtotal,
            globalDiscount,
            calculatedTotal,
            payment_method,
            payment_details || null,
            channel
        ]);

        const saleId = saleResult.insertId;

        // 2. Insertar ítems, descontar stock en variantes y asentar en Kardex
        for (const pi of processedItems) {
            const v = pi.variant;

            // Registrar ítem de venta (congelando precios históricos)
            await conn.query(`
                INSERT INTO sale_items (
                    sale_id, variant_id, product_name, size, color, sku,
                    unit_price, discount, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                saleId,
                v.id,
                v.product_name,
                v.size,
                v.color,
                v.sku,
                pi.unitPrice,
                pi.itemDiscount,
                pi.quantity,
                pi.lineSubtotal
            ]);

            // Descontar inventario real en product_variants
            const newStock = v.stock - pi.quantity;
            await conn.query(`
                UPDATE product_variants SET stock = ? WHERE id = ?
            `, [newStock, v.id]);

            // Asentar movimiento en Kardex de auditoría
            await conn.query(`
                INSERT INTO inventory_movements (
                    variant_id, user_id, movement_type, quantity,
                    previous_stock, new_stock, reason, reference_id
                ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)
            `, [
                v.id,
                userId,
                -pi.quantity,
                v.stock,
                newStock,
                `Venta en ${channel === 'physical' ? 'tienda física' : 'e-commerce'} Ticket: ${ticketNumber}`,
                ticketNumber
            ]);
        }

        await conn.commit();

        res.status(201).json({
            success: true,
            message: 'Venta registrada con éxito y stock descontado.',
            data: {
                sale_id: saleId,
                ticket_number: ticketNumber,
                total: calculatedTotal,
                payment_method,
                created_at: new Date(),
                items_count: processedItems.length
            }
        });

    } catch (error) {
        await conn.rollback();
        console.error('Error al registrar venta:', error);
        res.status(500).json({ success: false, message: 'Error interno en la transacción de venta.' });
    } finally {
        conn.release();
    }
};

// Listar ventas con filtros
const getSales = async (req, res) => {
    const { start_date, end_date, channel, status, search, limit = 50 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

    try {
        let sql = `
            SELECT 
                s.id, s.ticket_number, s.customer_name, s.customer_document,
                s.subtotal, s.discount, s.total, s.payment_method, s.status, s.channel,
                s.created_at, u.name AS seller_name, cs.id AS shift_id
            FROM sales s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN cash_shifts cs ON s.cash_shift_id = cs.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            sql += ' AND DATE(s.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND DATE(s.created_at) <= ?';
            params.push(end_date);
        }

        if (channel) {
            sql += ' AND s.channel = ?';
            params.push(channel);
        }

        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }

        if (search) {
            sql += ' AND (s.ticket_number LIKE ? OR s.customer_name LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term);
        }

        sql += ' ORDER BY s.id DESC LIMIT ?';
        params.push(safeLimit);

        const [sales] = await db.query(sql, params);

        res.json({ success: true, count: sales.length, data: sales });
    } catch (error) {
        console.error('Error al listar ventas:', error);
        res.status(500).json({ success: false, message: 'Error al consultar ventas.' });
    }
};

// Obtener detalle completo de un ticket de venta
const getSaleById = async (req, res) => {
    const { id } = req.params;

    try {
        const [sales] = await db.query(`
            SELECT s.*, u.name AS seller_name
            FROM sales s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? OR s.ticket_number = ?
        `, [id, id]);

        if (sales.length === 0) {
            return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
        }

        const sale = sales[0];

        const [items] = await db.query(`
            SELECT si.*, pv.image_url
            FROM sale_items si
            LEFT JOIN product_variants pv ON si.variant_id = pv.id
            WHERE si.sale_id = ?
            ORDER BY si.id ASC
        `, [sale.id]);

        sale.items = items;

        res.json({ success: true, data: sale });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar detalle de venta.' });
    }
};

// Anular venta y restituir stock a variantes con Kardex (Exclusivo Admin)
const cancelSale = async (req, res) => {
    const { id } = req.params;
    const { reason = 'Anulación de venta solicitada por administración' } = req.body;
    const userId = req.user.id;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [sales] = await conn.query(
            'SELECT * FROM sales WHERE id = ? FOR UPDATE',
            [id]
        );

        if (sales.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
        }

        const sale = sales[0];

        if (sale.status === 'cancelled') {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Esta venta ya se encuentra anulada.' });
        }

        // Obtener ítems para revertir el stock
        const [items] = await conn.query(
            'SELECT * FROM sale_items WHERE sale_id = ?',
            [sale.id]
        );

        for (const item of items) {
            // Obtener stock actual
            const [variants] = await conn.query(
                'SELECT stock FROM product_variants WHERE id = ? FOR UPDATE',
                [item.variant_id]
            );

            if (variants.length > 0) {
                const currentStock = variants[0].stock;
                const restoredStock = currentStock + item.quantity;

                // Restituir stock en variante
                await conn.query(
                    'UPDATE product_variants SET stock = ? WHERE id = ?',
                    [restoredStock, item.variant_id]
                );

                // Asentar en Kardex
                await conn.query(`
                    INSERT INTO inventory_movements (
                        variant_id, user_id, movement_type, quantity,
                        previous_stock, new_stock, reason, reference_id
                    ) VALUES (?, ?, 'cancellation', ?, ?, ?, ?, ?)
                `, [
                    item.variant_id,
                    userId,
                    item.quantity,
                    currentStock,
                    restoredStock,
                    `Anulación Ticket: ${sale.ticket_number}. Motivo: ${reason}`,
                    sale.ticket_number
                ]);
            }
        }

        // Marcar venta como anulada
        await conn.query(
            'UPDATE sales SET status = "cancelled" WHERE id = ?',
            [sale.id]
        );

        await conn.commit();

        res.json({
            success: true,
            message: `Venta ${sale.ticket_number} anulada exitosamente y stock restituido al inventario.`
        });

    } catch (error) {
        await conn.rollback();
        console.error('Error al anular venta:', error);
        res.status(500).json({ success: false, message: 'Error interno al anular venta.' });
    } finally {
        conn.release();
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById,
    cancelSale
};
