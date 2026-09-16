const db = require('../config/db');

// Apertura de turno de caja con monto inicial
const openShift = async (req, res) => {
    let { cash_register_id, initial_amount = 0 } = req.body;
    const userId = req.user.id;

    const amount = parseFloat(initial_amount);
    if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
            success: false,
            message: 'El monto inicial debe ser un número mayor o igual a 0.'
        });
    }

    try {
        // Asegurar que exista al menos una caja física en la base de datos
        const [registers] = await db.query('SELECT id, name FROM cash_registers WHERE is_active = TRUE ORDER BY id ASC');
        
        let targetRegisterId = cash_register_id ? parseInt(cash_register_id, 10) : null;

        if (registers.length === 0) {
            // Si no hay ninguna caja creada, crear automáticamente la Caja Principal 01
            const [newReg] = await db.query(
                'INSERT INTO cash_registers (name, location, is_active) VALUES (?, ?, TRUE)',
                ['Caja Principal 01', 'Mostrador Boutique']
            );
            targetRegisterId = newReg.insertId;
        } else if (!targetRegisterId || !registers.some(r => r.id === targetRegisterId)) {
            // Si la caja solicitada no existe, usar la primera activa
            targetRegisterId = registers[0].id;
        }

        // Verificar si esta caja ya tiene un turno abierto actualmente
        const [existing] = await db.query(
            'SELECT id, opened_at FROM cash_shifts WHERE cash_register_id = ? AND status = "open"',
            [targetRegisterId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un turno de caja abierto en esta estación.',
                shiftId: existing[0].id
            });
        }

        const [result] = await db.query(`
            INSERT INTO cash_shifts (cash_register_id, user_id, initial_amount, status)
            VALUES (?, ?, ?, 'open')
        `, [targetRegisterId, userId, amount]);

        res.status(201).json({
            success: true,
            message: 'Turno de caja abierto correctamente.',
            data: {
                shift_id: result.insertId,
                cash_register_id: targetRegisterId,
                initial_amount: amount,
                opened_at: new Date()
            }
        });
    } catch (error) {
        console.error('Error al abrir turno:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error interno al abrir turno de caja.' 
        });
    }
};

// Obtener estado en tiempo real del turno de caja activo (Arqueo en vivo)
const getCurrentShift = async (req, res) => {
    try {
        const [shifts] = await db.query(`
            SELECT cs.*, cr.name AS register_name, u.name AS user_name
            FROM cash_shifts cs
            JOIN cash_registers cr ON cs.cash_register_id = cr.id
            JOIN users u ON cs.user_id = u.id
            WHERE cs.status = 'open'
            ORDER BY cs.id DESC LIMIT 1
        `);

        if (shifts.length === 0) {
            return res.json({
                success: true,
                hasActiveShift: false,
                message: 'No hay turno de caja abierto actualmente.'
            });
        }

        const shift = shifts[0];
        const shiftId = shift.id;

        // 1. Total ventas por método de pago
        const [salesStats] = await db.query(`
            SELECT 
                payment_method,
                COALESCE(SUM(total), 0) AS total_amount,
                COUNT(id) AS count
            FROM sales
            WHERE cash_shift_id = ? AND status = 'completed'
            GROUP BY payment_method
        `, [shiftId]);

        let salesCash = 0;
        let salesCard = 0;
        let salesTransfer = 0;
        let salesMixed = 0;
        let totalSales = 0;

        salesStats.forEach(stat => {
            const amt = parseFloat(stat.total_amount);
            totalSales += amt;
            if (stat.payment_method === 'cash') salesCash = amt;
            if (stat.payment_method === 'card') salesCard = amt;
            if (stat.payment_method === 'transfer') salesTransfer = amt;
            if (stat.payment_method === 'mixed') salesMixed = amt;
        });

        // 2. Ingresos y retiros manuales
        const [movements] = await db.query(`
            SELECT cm.*, u.name AS user_name
            FROM cash_movements cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.cash_shift_id = ?
            ORDER BY cm.created_at DESC
        `, [shiftId]);

        let manualCashIn = 0;
        let manualCashOut = 0;

        movements.forEach(m => {
            const amt = parseFloat(m.amount);
            if (m.type === 'cash_in') manualCashIn += amt;
            if (m.type === 'cash_out') manualCashOut += amt;
        });

        // 3. Arqueo: Dinero en efectivo esperado
        const initialAmount = parseFloat(shift.initial_amount);
        const expectedCash = (initialAmount + salesCash + manualCashIn - manualCashOut);

        res.json({
            success: true,
            hasActiveShift: true,
            data: {
                shift,
                summary: {
                    initial_amount: initialAmount,
                    sales_cash: salesCash,
                    sales_card: salesCard,
                    sales_transfer: salesTransfer,
                    sales_mixed: salesMixed,
                    total_sales: totalSales,
                    manual_cash_in: manualCashIn,
                    manual_cash_out: manualCashOut,
                    expected_cash: expectedCash
                },
                movements
            }
        });
    } catch (error) {
        console.error('Error al consultar turno:', error);
        res.status(500).json({ success: false, message: 'Error interno al consultar turno de caja.' });
    }
};

// Registrar ingreso o retiro manual de caja
const addMovement = async (req, res) => {
    const { cash_shift_id, type, amount, reason } = req.body;
    const userId = req.user.id;

    const parsedAmount = parseFloat(amount);
    if (!['cash_in', 'cash_out'].includes(type) || isNaN(parsedAmount) || parsedAmount <= 0 || !reason) {
        return res.status(400).json({
            success: false,
            message: 'Datos incompletos. Debe indicar tipo (cash_in o cash_out), monto mayor a 0 y motivo.'
        });
    }

    try {
        // Validar que el turno esté abierto
        const [shifts] = await db.query(
            'SELECT id, status FROM cash_shifts WHERE id = ? AND status = "open"',
            [cash_shift_id]
        );

        if (shifts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El turno de caja especificado no existe o ya se encuentra cerrado.'
            });
        }

        const [result] = await db.query(`
            INSERT INTO cash_movements (cash_shift_id, user_id, type, amount, reason)
            VALUES (?, ?, ?, ?, ?)
        `, [cash_shift_id, userId, type, parsedAmount, reason.trim()]);

        res.status(201).json({
            success: true,
            message: `Movimiento de caja (${type === 'cash_in' ? 'Ingreso' : 'Retiro'}) registrado.`,
            data: {
                id: result.insertId,
                type,
                amount: parsedAmount,
                reason
            }
        });
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(500).json({ success: false, message: 'Error al registrar movimiento en caja.' });
    }
};

// Cierre de turno de caja y cálculo de arqueo (Esperado vs Contado)
const closeShift = async (req, res) => {
    const { cash_shift_id, counted_amount, notes } = req.body;

    const counted = parseFloat(counted_amount);
    if (isNaN(counted) || counted < 0) {
        return res.status(400).json({
            success: false,
            message: 'Debe ingresar el monto físico contado (mayor o igual a 0).'
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [shifts] = await conn.query(
            'SELECT * FROM cash_shifts WHERE id = ? AND status = "open" FOR UPDATE',
            [cash_shift_id]
        );

        if (shifts.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Turno no encontrado o ya cerrado.' });
        }

        const shift = shifts[0];

        // Ventas en efectivo
        const [sales] = await conn.query(`
            SELECT COALESCE(SUM(total), 0) AS total_cash
            FROM sales 
            WHERE cash_shift_id = ? AND payment_method = 'cash' AND status = 'completed'
        `, [cash_shift_id]);

        // Movimientos manuales
        const [movements] = await conn.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) AS total_in,
                COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) AS total_out
            FROM cash_movements
            WHERE cash_shift_id = ?
        `, [cash_shift_id]);

        const initialAmount = parseFloat(shift.initial_amount);
        const salesCash = parseFloat(sales[0].total_cash);
        const totalIn = parseFloat(movements[0].total_in);
        const totalOut = parseFloat(movements[0].total_out);

        const expectedAmount = initialAmount + salesCash + totalIn - totalOut;
        const difference = counted - expectedAmount;

        await conn.query(`
            UPDATE cash_shifts
            SET closed_at = NOW(),
                expected_amount = ?,
                counted_amount = ?,
                difference = ?,
                status = 'closed',
                notes = ?
            WHERE id = ?
        `, [expectedAmount, counted, difference, notes || null, cash_shift_id]);

        await conn.commit();

        res.json({
            success: true,
            message: 'Turno de caja cerrado exitosamente.',
            data: {
                shift_id: cash_shift_id,
                initial_amount: initialAmount,
                sales_cash: salesCash,
                expected_amount: expectedAmount,
                counted_amount: counted,
                difference: difference,
                difference_status: difference === 0 ? 'Exacto' : difference > 0 ? 'Sobrante' : 'Faltante'
            }
        });

    } catch (error) {
        await conn.rollback();
        console.error('Error al cerrar caja:', error);
        res.status(500).json({ success: false, message: 'Error interno al cerrar turno de caja.' });
    } finally {
        conn.release();
    }
};

// Historial de turnos de caja para auditoría
const getShiftHistory = async (req, res) => {
    try {
        const [shifts] = await db.query(`
            SELECT cs.*, cr.name AS register_name, u.name AS user_name
            FROM cash_shifts cs
            JOIN cash_registers cr ON cs.cash_register_id = cr.id
            JOIN users u ON cs.user_id = u.id
            ORDER BY cs.id DESC LIMIT 50
        `);

        res.json({ success: true, data: shifts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar historial de cajas.' });
    }
// Listar todas las cajas registradoras físicas
};

const getCashRegisters = async (req, res) => {
    try {
        const [registers] = await db.query('SELECT * FROM cash_registers ORDER BY id ASC');
        res.json({ success: true, data: registers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al consultar cajas registradoras.' });
    }
};

// Crear nueva caja registradora (Admin)
const createCashRegister = async (req, res) => {
    const { name, location = 'Tienda Principal' } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'El nombre de la caja es obligatorio.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO cash_registers (name, location, is_active) VALUES (?, ?, TRUE)',
            [name.trim(), location.trim()]
        );
        res.status(201).json({
            success: true,
            message: `Caja '${name}' creada exitosamente.`,
            data: { id: result.insertId, name, location }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear caja registradora.' });
    }
};

// Actualizar caja registradora (Admin)
const updateCashRegister = async (req, res) => {
    const { id } = req.params;
    const { name, location, is_active } = req.body;

    try {
        await db.query(`
            UPDATE cash_registers
            SET name = COALESCE(?, name),
                location = COALESCE(?, location),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [
            name ? name.trim() : null,
            location ? location.trim() : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            id
        ]);
        res.json({ success: true, message: 'Caja registradora actualizada con éxito.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar caja.' });
    }
};

// Desactivar caja registradora
const deleteCashRegister = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE cash_registers SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ success: true, message: 'Caja registradora desactivada.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al desactivar caja.' });
    }
};

module.exports = {
    openShift,
    getCurrentShift,
    addMovement,
    closeShift,
    getShiftHistory,
    getCashRegisters,
    createCashRegister,
    updateCashRegister,
    deleteCashRegister
};
