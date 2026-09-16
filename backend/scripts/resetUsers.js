const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Cargar .env según entorno
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
} else {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const resetUsers = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tienda_diana_db',
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log('========================================');
        console.log('   🔄 RESETEANDO USUARIOS');
        console.log('========================================\n');

        // Eliminar todos los usuarios excepto el primero (por seguridad)
        const [deleted] = await pool.query('DELETE FROM usuarios WHERE id > 1');
        console.log(`🗑️  Eliminados ${deleted.affectedRows} usuarios`);

        // Crear usuarios definitivos
        const adminPass = await bcrypt.hash('Admin2024!@#', 10);
        const cajeroPass = await bcrypt.hash('Cajero2024!@#', 10);
        const almacenPass = await bcrypt.hash('Almacen2024!@#', 10);

        await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, estado) 
            VALUES 
            ('Administrador', 'admin@tiendadiana.com', ?, 'admin', 'activo'),
            ('Cajero Principal', 'cajero@tiendadiana.com', ?, 'cajero', 'activo'),
            ('Almacenero', 'almacen@tiendadiana.com', ?, 'almacen', 'activo')
        `, [adminPass, cajeroPass, almacenPass]);

        console.log('✅ USUARIOS RESETEADOS:\n');
        console.log('   👤 Admin:  admin@tiendadiana.com / Admin2024!@#');
        console.log('   👤 Cajero: cajero@tiendadiana.com / Cajero2024!@#');
        console.log('   👤 Almacen: almacen@tiendadiana.com / Almacen2024!@#');
        console.log('\n⚠️  ¡CAMBIAR CONTRASEÑAS EN EL PRIMER INICIO!');
        console.log('========================================');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
};

resetUsers();