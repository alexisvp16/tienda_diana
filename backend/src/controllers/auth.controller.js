const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const login = async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Debe ingresar correo y contraseña.'
        });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 150 || password.length > 128) {
        return res.status(400).json({ success: false, message: 'Datos de acceso no válidos.' });
    }

    try {
        const [users] = await db.query(
            'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const user = users[0];
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Usuario desactivado. Contacte a la administración.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET no está configurado.');
        }

        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(payload, secret, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        });

        return res.json({
            success: true,
            message: 'Bienvenido al sistema TIENDADIANA',
            data: { user: payload, token }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al autenticar.'
        });
    }
};

const getMe = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        return res.json({ success: true, data: users[0] });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al obtener datos de usuario.' });
    }
};

module.exports = { login, getMe };
