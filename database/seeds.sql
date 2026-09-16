-- =====================================================================
-- SISTEMA TIENDADIANA - DATOS SEMILLA INICIALES
-- =====================================================================

USE `tienda_diana_db`;

-- 1. Caja Registradora Principal
INSERT INTO `cash_registers` (`id`, `name`, `location`, `is_active`) VALUES
(1, 'Caja Principal 01', 'Boutique Central', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Usuarios Iniciales (Contraseñas temporales: Admin123* y Cajero123*)
-- Los hashes bcrypt corresponden a Admin123* y Cajero123*
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`) VALUES
(1, 'Diana Administradora', 'admin@tiendadiana.com', '$2a$10$Pj0kY1lU0cO2N4XgRk8x.OPo8l1Lrq2Tf06U.Z8QyC6M9rJd5L6g.', 'admin', 1),
(2, 'Cajera Turno', 'cajero@tiendadiana.com', '$2a$10$Pj0kY1lU0cO2N4XgRk8x.OPo8l1Lrq2Tf06U.Z8QyC6M9rJd5L6g.', 'cashier', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Categorías de Ropa de Dama
INSERT INTO `categories` (`id`, `name`, `description`, `is_active`) VALUES
(1, 'Vestidos', 'Vestidos de fiesta, cóctel, casuales y de temporada', 1),
(2, 'Blusas y Tops', 'Blusas elegantes, camiseras, crop tops y bodys', 1),
(3, 'Pantalones y Jeans', 'Pantalones sastre, palazzo, jeans flare y skinny', 1),
(4, 'Faldas y Shorts', 'Faldas midi, tubo, plisadas y shorts de lino/denim', 1),
(5, 'Conjuntos y Enterizos', 'Conjuntos dos piezas y enterizos de temporada', 1),
(6, 'Abrigos y Blazers', 'Blazers ejecutivos, casacas y abrigos de punto', 1),
(7, 'Accesorios', 'Cinturones, carteras y complementos', 1)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 4. Producto Muestra: Vestido Gala Sofía
INSERT INTO `products` (`id`, `category_id`, `code`, `name`, `description`, `brand`, `base_price`, `is_active`, `is_visible_online`) VALUES
(1, 1, 'VEST-SOFIA', 'Vestido Gala Sofía', 'Vestido largo con abertura lateral y escote en V, tela satinada premium', 'Colección Diana', 120.00, 1, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. Variantes de Prenda (Talla + Color + SKU único) con Stock Inicial
INSERT INTO `product_variants` (`id`, `product_id`, `size`, `color`, `sku`, `barcode`, `cost_price`, `sale_price`, `stock`) VALUES
(1, 1, 'S', 'Negro', 'VEST-SOF-S-NEG', '7750001001', 50.00, 120.00, 5),
(2, 1, 'M', 'Negro', 'VEST-SOF-M-NEG', '7750001002', 50.00, 120.00, 3),
(3, 1, 'M', 'Rojo Rubí', 'VEST-SOF-M-ROJ', '7750001003', 50.00, 120.00, 4),
(4, 1, 'L', 'Rojo Rubí', 'VEST-SOF-L-ROJ', '7750001004', 50.00, 120.00, 2)
ON DUPLICATE KEY UPDATE `sale_price` = VALUES(`sale_price`);

-- 6. Registro de Kardex para el Stock Inicial
INSERT INTO `inventory_movements` (`variant_id`, `user_id`, `movement_type`, `quantity`, `previous_stock`, `new_stock`, `reason`, `reference_id`) VALUES
(1, 1, 'initial_stock', 5, 0, 5, 'Carga inicial de inventario', 'INIT-001'),
(2, 1, 'initial_stock', 3, 0, 3, 'Carga inicial de inventario', 'INIT-001'),
(3, 1, 'initial_stock', 4, 0, 4, 'Carga inicial de inventario', 'INIT-001'),
(4, 1, 'initial_stock', 2, 0, 2, 'Carga inicial de inventario', 'INIT-001');

