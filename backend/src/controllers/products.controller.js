const db = require('../config/db');

// Función auxiliar para normalizar SKU
const generateSku = (baseCode, size, color) => {
    const clean = (str) => String(str || '').trim().toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '');
    return `${clean(baseCode)}-${clean(size)}-${clean(color).substring(0, 3)}`;
};

// Listar todos los productos con sus variantes y stock total
const getProducts = async (req, res) => {
    const { category_id, search, is_active } = req.query;

    try {
        let sql = `
            SELECT 
                p.id, p.category_id, c.name AS category_name,
                p.code, p.name, p.description, p.brand, p.base_price,
                p.is_active, p.is_visible_online, p.created_at,
                COALESCE(SUM(pv.stock), 0) AS total_stock,
                COUNT(pv.id) AS variants_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            WHERE 1=1
        `;
        const params = [];

        if (category_id) {
            sql += ' AND p.category_id = ?';
            params.push(category_id);
        }

        if (search) {
            sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR pv.sku LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        if (is_active !== undefined) {
            sql += ' AND p.is_active = ?';
            params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        }

        sql += ' GROUP BY p.id ORDER BY p.id DESC';

        const [products] = await db.query(sql, params);

        // Traer las variantes de cada producto
        const productIds = products.map(p => p.id);
        let variantsMap = {};

        if (productIds.length > 0) {
            const [variants] = await db.query(`
                SELECT id, product_id, size, color, sku, barcode, cost_price, sale_price, stock, image_url
                FROM product_variants
                WHERE product_id IN (?)
                ORDER BY id ASC
            `, [productIds]);

            variants.forEach(v => {
                if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
                variantsMap[v.product_id].push(v);
            });
        }

        const enrichedProducts = products.map(p => ({
            ...p,
            variants: variantsMap[p.id] || []
        }));

        res.json({
            success: true,
            count: enrichedProducts.length,
            data: enrichedProducts
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ success: false, message: 'Error interno al consultar productos.' });
    }
};

// Obtener detalle de un producto individual por ID
const getProductById = async (req, res) => {
    const { id } = req.params;

    try {
        const [products] = await db.query(`
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }

        const product = products[0];

        const [variants] = await db.query(`
            SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC
        `, [id]);

        product.variants = variants;

        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener producto.' });
    }
};

// Crear producto con variantes y registrar Kardex inicial (Transaccional)
const createProduct = async (req, res) => {
    const {
        category_id, code, name, description, brand,
        base_price, is_visible_online, variants
    } = req.body;

    if (!category_id || !code || !name || !base_price || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Datos incompletos. Debe indicar categoría, código, nombre, precio base y al menos una variante (Talla + Color).'
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Insertar producto base
        const [prodResult] = await conn.query(`
            INSERT INTO products (category_id, code, name, description, brand, base_price, is_visible_online)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            category_id,
            code.trim().toUpperCase(),
            name.trim(),
            description || null,
            brand || 'Colección Diana',
            parseFloat(base_price),
            is_visible_online !== undefined ? (is_visible_online ? 1 : 0) : 1
        ]);

        const productId = prodResult.insertId;

        // 2. Insertar variantes y registrar Kardex
        for (const variant of variants) {
            const size = variant.size ? String(variant.size).trim().toUpperCase() : 'ESTANDAR';
            const color = variant.color ? String(variant.color).trim() : 'Único';
            const sku = variant.sku ? variant.sku.trim().toUpperCase() : generateSku(code, size, color);
            const costPrice = parseFloat(variant.cost_price || 0);
            const salePrice = parseFloat(variant.sale_price || base_price);
            const initialStock = parseInt(variant.stock || 0, 10);

            const [varResult] = await conn.query(`
                INSERT INTO product_variants 
                (product_id, size, color, sku, barcode, cost_price, sale_price, stock, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                productId, size, color, sku,
                variant.barcode || null,
                costPrice, salePrice, initialStock,
                variant.image_url || null
            ]);

            const variantId = varResult.insertId;

            // 3. Kardex para stock inicial si es mayor a 0
            if (initialStock > 0) {
                await conn.query(`
                    INSERT INTO inventory_movements
                    (variant_id, user_id, movement_type, quantity, previous_stock, new_stock, reason, reference_id)
                    VALUES (?, ?, 'initial_stock', ?, 0, ?, 'Stock inicial de creación de producto', ?)
                `, [
                    variantId,
                    req.user ? req.user.id : 1,
                    initialStock,
                    initialStock,
                    `INIT-PROD-${productId}`
                ]);
            }
        }

        await conn.commit();

        res.status(201).json({
            success: true,
            message: 'Producto y variantes creados exitosamente.',
            data: { productId, code, name }
        });

    } catch (error) {
        await conn.rollback();
        console.error('Error al crear producto:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un producto con ese código o una variante con ese SKU.'
            });
        }
        res.status(500).json({ success: false, message: 'Error en la transacción de creación de producto.' });
    } finally {
        conn.release();
    }
};

// Actualizar producto COMPLETO (Prenda Base + Variantes)
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { 
        category_id, code, name, description, brand, base_price, 
        is_active, is_visible_online, variants 
    } = req.body;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Actualizar atributos base de la prenda
        await conn.query(`
            UPDATE products 
            SET category_id = COALESCE(?, category_id),
                code = COALESCE(?, code),
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                brand = COALESCE(?, brand),
                base_price = COALESCE(?, base_price),
                is_active = COALESCE(?, is_active),
                is_visible_online = COALESCE(?, is_visible_online)
            WHERE id = ?
        `, [
            category_id,
            code ? code.trim().toUpperCase() : null,
            name ? name.trim() : null,
            description,
            brand,
            base_price ? parseFloat(base_price) : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            is_visible_online !== undefined ? (is_visible_online ? 1 : 0) : null,
            id
        ]);

        // 2. Si se envían variantes, sincronizar/editar cada una
        if (Array.isArray(variants)) {
            // Obtener variantes actuales
            const [existingVariants] = await conn.query(
                'SELECT * FROM product_variants WHERE product_id = ?',
                [id]
            );
            const existingMap = {};
            existingVariants.forEach(ev => { existingMap[ev.id] = ev; });

            const incomingIds = [];

            for (const v of variants) {
                const size = v.size ? String(v.size).trim().toUpperCase() : 'ESTANDAR';
                const color = v.color ? String(v.color).trim() : 'Único';
                const baseCode = code || 'PRENDA';
                const sku = v.sku ? v.sku.trim().toUpperCase() : generateSku(baseCode, size, color);
                const costPrice = parseFloat(v.cost_price || 0);
                const salePrice = parseFloat(v.sale_price || base_price || 0);
                const targetStock = parseInt(v.stock || 0, 10);

                if (v.id && existingMap[v.id]) {
                    // Variante existente: actualizar
                    incomingIds.push(v.id);
                    const currentStock = existingMap[v.id].stock;
                    const stockDiff = targetStock - currentStock;

                    await conn.query(`
                        UPDATE product_variants
                        SET size = ?, color = ?, sku = ?, cost_price = ?, sale_price = ?, stock = ?
                        WHERE id = ?
                    `, [size, color, sku, costPrice, salePrice, targetStock, v.id]);

                    // Si el stock se editó directamente, asentar el ajuste en Kardex
                    if (stockDiff !== 0) {
                        const movType = stockDiff > 0 ? 'adjustment_in' : 'adjustment_out';
                        await conn.query(`
                            INSERT INTO inventory_movements 
                            (variant_id, user_id, movement_type, quantity, previous_stock, new_stock, reason, reference_id)
                            VALUES (?, ?, ?, ?, ?, ?, 'Ajuste manual desde edición de prenda', ?)
                        `, [
                            v.id,
                            req.user ? req.user.id : 1,
                            movType,
                            stockDiff,
                            currentStock,
                            targetStock,
                            `EDIT-PROD-${id}`
                        ]);
                    }
                } else {
                    // Nueva variante agregada durante la edición
                    const [newVarResult] = await conn.query(`
                        INSERT INTO product_variants 
                        (product_id, size, color, sku, cost_price, sale_price, stock)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [id, size, color, sku, costPrice, salePrice, targetStock]);

                    const newVariantId = newVarResult.insertId;
                    incomingIds.push(newVariantId);

                    if (targetStock > 0) {
                        await conn.query(`
                            INSERT INTO inventory_movements 
                            (variant_id, user_id, movement_type, quantity, previous_stock, new_stock, reason, reference_id)
                            VALUES (?, ?, 'initial_stock', ?, 0, ?, 'Stock inicial de nueva variante en edición', ?)
                        `, [
                            newVariantId,
                            req.user ? req.user.id : 1,
                            targetStock,
                            targetStock,
                            `EDIT-PROD-${id}`
                        ]);
                    }
                }
            }

            // Eliminar variantes que el usuario quitó (si no tienen ventas)
            for (const ev of existingVariants) {
                if (!incomingIds.includes(ev.id)) {
                    // Verificar si tiene ítems vendidos
                    const [sold] = await conn.query('SELECT id FROM sale_items WHERE variant_id = ? LIMIT 1', [ev.id]);
                    if (sold.length === 0) {
                        await conn.query('DELETE FROM product_variants WHERE id = ?', [ev.id]);
                    } else {
                        // Si ya tiene ventas, poner stock en 0 para no romper historial
                        await conn.query('UPDATE product_variants SET stock = 0 WHERE id = ?', [ev.id]);
                    }
                }
            }
        }

        await conn.commit();
        res.json({ success: true, message: 'Prenda y variantes actualizadas con éxito.' });

    } catch (error) {
        await conn.rollback();
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar prenda y variantes.' });
    } finally {
        conn.release();
    }
};

// Eliminar / Desactivar producto
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
        res.json({ success: true, message: 'Prenda desactivada con éxito del catálogo.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al desactivar prenda.' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
