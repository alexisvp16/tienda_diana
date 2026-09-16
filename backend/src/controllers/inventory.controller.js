const db = require('../config/db');

// Ajustar stock manualmente (Compra a proveedor, Ajuste positivo/negativo)
const adjustStock = async (req, res) => {
    const { variant_id, movement_type, quantity, reason, reference_id } = req.body;

    const qty = parseInt(quantity, 10);
    if (!variant_id || !movement_type || isNaN(qty) || qty <= 0 || !reason) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos. Debe indicar variante, tipo de movimiento, cantidad mayor a 0 y motivo.'
        });
    }

    const validTypes = ['purchase', 'adjustment_in', 'adjustment_out', 'return'];
    if (!validTypes.includes(movement_type)) {
        return res.status(400).json({
            success: false,
            message: `Tipo de movimiento inválido. Permitidos: ${validTypes.join(', ')}.`
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Obtener stock actual con bloqueo de fila para consistencia
        const [variants] = await conn.query(
            'SELECT id, stock, sku FROM product_variants WHERE id = ? FOR UPDATE',
            [variant_id]
        );

        if (variants.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Variante no encontrada.' });
        }

        const currentStock = variants[0].stock;
        let newStock;

        if (movement_type === 'adjustment_out') {
            if (currentStock < qty) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Stock insuficiente para salida. Stock actual: ${currentStock}, Solicitado: ${qty}`
                });
            }
            newStock = currentStock - qty;
        } else {
            // Entradas: purchase, adjustment_in, return
            newStock = currentStock + qty;
        }

        // 2. Actualizar stock en la variante
        await conn.query(
            'UPDATE product_variants SET stock = ? WHERE id = ?',
            [newStock, variant_id]
        );

        // 3. Registrar movimiento en el Kardex
        await conn.query(`
            INSERT INTO inventory_movements 
            (variant_id, user_id, movement_type, quantity, previous_stock, new_stock, reason, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            variant_id,
            req.user.id,
            movement_type,
            movement_type === 'adjustment_out' ? -qty : qty,
            currentStock,
            newStock,
            reason.trim(),
            reference_id || 'ADJUST-MANUAL'
        ]);

        await conn.commit();

        res.json({
            success: true,
            message: 'Inventario actualizado y registrado en Kardex.',
            data: {
                variant_id,
                sku: variants[0].sku,
                previous_stock: currentStock,
                new_stock: newStock
            }
        });

    } catch (error) {
        await conn.rollback();
        console.error('Error al ajustar stock:', error);
        res.status(500).json({ success: false, message: 'Error interno en ajuste de inventario.' });
    } finally {
        conn.release();
    }
};

// Consultar Kardex (Historial completo de auditoría de movimientos)
const getKardex = async (req, res) => {
    const { variant_id, product_id, limit = 100 } = req.query;

    try {
        let sql = `
            SELECT 
                im.id, im.variant_id, im.movement_type, im.quantity,
                im.previous_stock, im.new_stock, im.reason, im.reference_id,
                im.created_at,
                u.name AS user_name,
                p.name AS product_name,
                p.code AS product_code,
                pv.size, pv.color, pv.sku
            FROM inventory_movements im
            JOIN product_variants pv ON im.variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            JOIN users u ON im.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (variant_id) {
            sql += ' AND im.variant_id = ?';
            params.push(variant_id);
        }

        if (product_id) {
            sql += ' AND pv.product_id = ?';
            params.push(product_id);
        }

        sql += ' ORDER BY im.created_at DESC, im.id DESC LIMIT ?';
        params.push(parseInt(limit, 10));

        const [movements] = await db.query(sql, params);

        res.json({
            success: true,
            count: movements.length,
            data: movements
        });
    } catch (error) {
        console.error('Error al obtener Kardex:', error);
        res.status(500).json({ success: false, message: 'Error al consultar Kardex.' });
    }
};

module.exports = {
    adjustStock,
    getKardex
};

