const db = require('../config/db');

const getCategories = async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC'
        );
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al listar categorías.' });
    }
};

const createCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'El nombre de categoría es obligatorio.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name.trim(), description || null]
        );
        res.status(201).json({
            success: true,
            message: 'Categoría creada con éxito.',
            data: { id: result.insertId, name, description }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe una categoría con ese nombre.' });
        }
        res.status(500).json({ success: false, message: 'Error al crear categoría.' });
    }
};

const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
    }

    try {
        await db.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name.trim(), description || null, id]
        );
        res.json({ success: true, message: 'Categoría actualizada con éxito.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya existe una categoría con ese nombre.' });
        }
        res.status(500).json({ success: false, message: 'Error al actualizar categoría.' });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Desactivar categoría en vez de borrar para preservar integridad histórica
        await db.query('UPDATE categories SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ success: true, message: 'Categoría desactivada con éxito.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar categoría.' });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
