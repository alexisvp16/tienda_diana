const bcrypt = require('bcryptjs');
const db = require('../config/db');
const VALID_ROLES = new Set(['admin', 'cashier', 'supervisor']);

// Listar todos los usuarios y sus roles
const getUsers = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, name, email, role, is_active, created_at, updated_at
            FROM users
            ORDER BY id ASC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar usuarios.' });
    }
};

// Crear nuevo usuario (con rol: admin, cashier, supervisor, etc.)
const createUser = async (req, res) => {
    const { name, email, password, role = 'cashier' } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Nombre, correo y contraseña son obligatorios.'
        });
    }

    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    if (name.trim().length > 100 || email.trim().length > 150 || password.length < 10 || password.length > 128 || !VALID_ROLES.has(normalizedRole)) {
        return res.status(400).json({ success: false, message: 'Los datos del usuario no son válidos.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(`
            INSERT INTO users (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, TRUE)
        `, [name.trim(), email.toLowerCase().trim(), hash, normalizedRole]);

        res.status(201).json({
            success: true,
            message: `Usuario ${name} con rol ${role} creado exitosamente.`,
            data: { id: result.insertId, name, email, role: normalizedRole }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ese correo ya está registrado.' });
        }
        res.status(500).json({ success: false, message: 'Error al crear usuario.' });
    }
};

// Actualizar usuario existente (nombre, email, rol, activo, contraseña)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, is_active, password } = req.body;

    const normalizedRole = role === undefined ? null : (typeof role === 'string' ? role.trim().toLowerCase() : '');
    if (normalizedRole !== null && !VALID_ROLES.has(normalizedRole)) {
        return res.status(400).json({ success: false, message: 'El rol indicado no es válido.' });
    }
    if (password !== undefined && (typeof password !== 'string' || (password.length > 0 && (password.length < 10 || password.length > 128)))) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener entre 10 y 128 caracteres.' });
    }

    try {
        let updateSql = `
            UPDATE users
            SET name = COALESCE(?, name),
                email = COALESCE(?, email),
                role = COALESCE(?, role),
                is_active = COALESCE(?, is_active)
        `;
        const params = [
            name ? name.trim() : null,
            email ? email.toLowerCase().trim() : null,
            normalizedRole,
            is_active !== undefined ? (is_active ? 1 : 0) : null
        ];

        // Si se envió nueva contraseña, hashearla
        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password.trim(), salt);
            updateSql += ', password_hash = ?';
            params.push(hash);
        }

        updateSql += ' WHERE id = ?';
        params.push(id);

        await db.query(updateSql, params);

        res.json({ success: true, message: 'Usuario actualizado con éxito.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ese correo ya pertenece a otro usuario.' });
        }
        res.status(500).json({ success: false, message: 'Error al actualizar usuario.' });
    }
};

// Desactivar usuario
const deleteUser = async (req, res) => {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
        return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta en sesión.' });
    }

    try {
        await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario desactivado.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al desactivar usuario.' });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};
