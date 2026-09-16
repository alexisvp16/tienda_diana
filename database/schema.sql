-- =====================================================================
-- SISTEMA TIENDADIANA - REINICIO DE BASE DE DATOS SOLO PARA DESARROLLO
-- Ropa de Dama: Boutique Física + API Ecommerce-Ready
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `tienda_diana_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `tienda_diana_db`;

-- Desactivar temporalmente revisión de llaves foráneas para reinicios limpios
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `inventory_movements`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `cash_movements`;
DROP TABLE IF EXISTS `cash_shifts`;
DROP TABLE IF EXISTS `cash_registers`;
DROP TABLE IF EXISTS `ticket_sequences`;
DROP TABLE IF EXISTS `store_settings`;
DROP TABLE IF EXISTS `schema_migrations`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. TABLA: users (Usuarios y Roles)
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'cashier',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 1.1 TABLA: store_settings (Configuración de tienda)
-- ---------------------------------------------------------------------
CREATE TABLE `store_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `store_name` VARCHAR(150) NOT NULL DEFAULT 'TIENDADIANA BOUTIQUE',
    `document_number` VARCHAR(50) DEFAULT NULL,
    `address` VARCHAR(255) DEFAULT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `ticket_message` VARCHAR(255) DEFAULT NULL,
    `logo_url` LONGTEXT NULL,
    `theme` VARCHAR(50) NOT NULL DEFAULT 'rose',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'S/',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO `store_settings` (`id`, `store_name`, `theme`, `currency`)
VALUES (1, 'TIENDADIANA BOUTIQUE', 'rose', 'S/');

CREATE TABLE `ticket_sequences` (
    `sequence_key` VARCHAR(20) PRIMARY KEY,
    `last_number` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. TABLA: cash_registers (Cajas Físicas)
-- ---------------------------------------------------------------------
CREATE TABLE `cash_registers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(100) DEFAULT 'Tienda Principal',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO `cash_registers` (`id`, `name`, `location`, `is_active`)
VALUES 
    (1, 'Caja Principal 01', 'Mostrador Central Boutique', TRUE),
    (2, 'Caja 02 - Pasarela', 'Segundo Nivel / Vestidores', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ---------------------------------------------------------------------
-- 3. TABLA: cash_shifts (Turnos y Arqueos de Caja)
-- ---------------------------------------------------------------------
CREATE TABLE `cash_shifts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cash_register_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `opened_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `closed_at` TIMESTAMP NULL,
    `initial_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `expected_amount` DECIMAL(10,2) DEFAULT NULL,
    `counted_amount` DECIMAL(10,2) DEFAULT NULL,
    `difference` DECIMAL(10,2) DEFAULT NULL,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `notes` TEXT NULL,
    CONSTRAINT `fk_shift_register` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers`(`id`),
    CONSTRAINT `fk_shift_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. TABLA: cash_movements (Ingresos y Retiros Manuales en Turno)
-- ---------------------------------------------------------------------
CREATE TABLE `cash_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cash_shift_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `type` ENUM('cash_in', 'cash_out') NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cmov_shift` FOREIGN KEY (`cash_shift_id`) REFERENCES `cash_shifts`(`id`),
    CONSTRAINT `fk_cmov_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. TABLA: categories (Categorías de Prendas)
-- ---------------------------------------------------------------------
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. TABLA: products (Prenda Base - Atributos generales)
-- ---------------------------------------------------------------------
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `brand` VARCHAR(100) DEFAULT 'Colección Diana',
    `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_visible_online` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_prod_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. TABLA: product_variants (Variantes Talla + Color y Stock Real)
-- ---------------------------------------------------------------------
CREATE TABLE `product_variants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `color` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(100) NOT NULL UNIQUE,
    `barcode` VARCHAR(100) UNIQUE NULL,
    `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `sale_price` DECIMAL(10,2) NOT NULL,
    `stock` INT NOT NULL DEFAULT 0,
    `image_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_var_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. TABLA: inventory_movements (Kardex Auditor Inmutable)
-- ---------------------------------------------------------------------
CREATE TABLE `inventory_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `variant_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `movement_type` ENUM('initial_stock', 'purchase', 'sale', 'adjustment_in', 'adjustment_out', 'return', 'cancellation') NOT NULL,
    `quantity` INT NOT NULL,
    `previous_stock` INT NOT NULL,
    `new_stock` INT NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `reference_id` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_kardex_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`),
    CONSTRAINT `fk_kardex_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. TABLA: sales (Ventas Físicas y Multicanal)
-- ---------------------------------------------------------------------
CREATE TABLE `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
    `cash_shift_id` INT NULL,
    `user_id` INT NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL DEFAULT 'Cliente General',
    `customer_document` VARCHAR(50) NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(10,2) NOT NULL,
    `payment_method` ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL DEFAULT 'cash',
    `payment_details` TEXT NULL,
    `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
    `channel` ENUM('physical', 'ecommerce') NOT NULL DEFAULT 'physical',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sale_shift` FOREIGN KEY (`cash_shift_id`) REFERENCES `cash_shifts`(`id`),
    CONSTRAINT `fk_sale_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. TABLA: sale_items (Detalle de Prendas Vendidas - Precio Congelado)
-- ---------------------------------------------------------------------
CREATE TABLE `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `variant_id` INT NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `size` VARCHAR(20) NOT NULL,
    `color` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `quantity` INT NOT NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    CONSTRAINT `fk_item_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_item_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
) ENGINE=InnoDB;
