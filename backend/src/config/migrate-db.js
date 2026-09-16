const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const migrationsDirectory = path.resolve(__dirname, '../../../database/migrations');

async function runMigrations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number.parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'tienda_diana_db',
        multipleStatements: true
    });

    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);

        const files = fs.readdirSync(migrationsDirectory)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        for (const filename of files) {
            const [applied] = await connection.query(
                'SELECT id FROM schema_migrations WHERE filename = ?',
                [filename]
            );

            if (applied.length > 0) {
                console.log(`Omitida: ${filename}`);
                continue;
            }

            const sql = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8');
            console.log(`Aplicando: ${filename}`);
            await connection.query(sql);
            await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
        }

        console.log('Migraciones completadas correctamente.');
    } finally {
        await connection.end();
    }
}

runMigrations().catch((error) => {
    console.error('Error al ejecutar migraciones:', error.message);
    process.exit(1);
});
