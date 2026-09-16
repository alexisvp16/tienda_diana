const db = require('../config/db');

const VALID_THEMES = new Set(['rose', 'emerald', 'noir']);
const MAX_LOGO_LENGTH = 3 * 1024 * 1024;

const getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM store_settings WHERE id = 1');

        if (rows.length === 0) {
            return res.status(503).json({
                success: false,
                message: 'La configuración de tienda no está inicializada. Ejecute las migraciones.'
            });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error al obtener ajustes:', error);
        return res.status(500).json({ success: false, message: 'Error al consultar ajustes de la tienda.' });
    }
};

const updateSettings = async (req, res) => {
    const {
        store_name, document_number, address, phone,
        ticket_message, logo_url, theme, currency
    } = req.body;

    if (theme !== undefined && !VALID_THEMES.has(theme)) {
        return res.status(400).json({ success: false, message: 'Tema visual no válido.' });
    }

    if (logo_url !== undefined && logo_url !== null && (typeof logo_url !== 'string' || logo_url.length > MAX_LOGO_LENGTH)) {
        return res.status(400).json({ success: false, message: 'El logo es inválido o supera el tamaño permitido.' });
    }

    const textValues = [
        ['store_name', store_name, 150],
        ['document_number', document_number, 50],
        ['address', address, 255],
        ['phone', phone, 50],
        ['ticket_message', ticket_message, 255],
        ['currency', currency, 10]
    ];

    if (textValues.some(([, value, maxLength]) => value !== undefined && (typeof value !== 'string' || value.trim().length > maxLength))) {
        return res.status(400).json({ success: false, message: 'Uno o más datos de tienda no son válidos.' });
    }

    try {
        await db.query(`
            UPDATE store_settings
            SET store_name = COALESCE(?, store_name),
                document_number = COALESCE(?, document_number),
                address = COALESCE(?, address),
                phone = COALESCE(?, phone),
                ticket_message = COALESCE(?, ticket_message),
                logo_url = COALESCE(?, logo_url),
                theme = COALESCE(?, theme),
                currency = COALESCE(?, currency)
            WHERE id = 1
        `, [
            store_name === undefined ? null : store_name.trim(),
            document_number === undefined ? null : document_number.trim(),
            address === undefined ? null : address.trim(),
            phone === undefined ? null : phone.trim(),
            ticket_message === undefined ? null : ticket_message.trim(),
            logo_url === undefined ? null : logo_url,
            theme === undefined ? null : theme,
            currency === undefined ? null : currency.trim()
        ]);

        const [rows] = await db.query('SELECT * FROM store_settings WHERE id = 1');
        return res.json({
            success: true,
            message: 'Ajustes de tienda actualizados con éxito.',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error al guardar ajustes:', error);
        return res.status(500).json({ success: false, message: 'Error interno al actualizar ajustes.' });
    }
};

module.exports = { getSettings, updateSettings };
