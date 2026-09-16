const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Cargar .env según entorno
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
} else {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tienda_diana_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true,
    multipleStatements: false // ✅ SEGURO
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`[MySQL] Conectado a '${process.env.DB_NAME || 'tienda_diana_db'}'`);
        connection.release();
        return true;
    } catch (error) {
        console.error(`[MySQL ERROR] ${error.message}`);
        return false;
    }
}

module.exports = {
    pool,
    query: (sql, params) => pool.query(sql, params),
    getConnection: () => pool.getConnection(),
    testConnection,
    closePool: () => pool.end()
};