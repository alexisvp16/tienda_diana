const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

const createUsers = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tienda_diana_db'
    });

    try {
        console.log('👤 Creando usuarios de prueba...');

        // Comprobar si ya existen usuarios
        const [existing] = await pool.query(
            'SELECT COUNT(*) AS count FROM users'
        );

        if (existing[0].count > 0) {
            console.log(
                `⚠️ Ya existen ${existing[0].count} usuarios.`
            );
            console.log('   No se crearán usuarios duplicados.');
            return;
        }

        // Contraseñas de prueba
        const adminPassword = 'Admin2024!@#';
        const cashierPassword = 'Cajero2024!@#';

        // Hashear contraseñas
        const adminHash = await bcrypt.hash(adminPassword, 12);
        const cashierHash = await bcrypt.hash(cashierPassword, 12);

        // Crear administrador
        await pool.query(`
            INSERT INTO users
                (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [
            'Administrador',
            'admin@tiendadiana.com',
            adminHash,
            'admin',
            1
        ]);

        // Crear cajero
        await pool.query(`
            INSERT INTO users
                (name, email, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [
            'Cajero Principal',
            'cajero@tiendadiana.com',
            cashierHash,
            'cashier',
            1
        ]);

        console.log('\n✅ USUARIOS CREADOS CORRECTAMENTE');
        console.log('');
        console.log('👑 ADMIN');
        console.log('   Email: admin@tiendadiana.com');
        console.log('   Password: Admin2024!@#');
        console.log('');
        console.log('💰 CAJERO');
        console.log('   Email: cajero@tiendadiana.com');
        console.log('   Password: Cajero2024!@#');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
};

createUsers();