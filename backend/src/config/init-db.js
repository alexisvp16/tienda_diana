const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function initDatabase() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('db:init elimina tablas y está bloqueado en producción. Use npm run db:migrate.');
    }

    console.log('====================================================');
    console.log('       INICIALIZACIÓN DE BASE DE DATOS TIENDADIANA  ');
    console.log('====================================================\n');

    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    let connection;
    try {
        console.log(`1. Conectando al servidor MySQL (${config.host}:${config.port}, usuario: ${config.user})...`);
        connection = await mysql.createConnection(config);
        console.log('   [OK] Conexión establecida con el motor MySQL.\n');

        console.log('2. Ejecutando database/schema.sql...');
        const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('   [OK] Base de datos `tienda_diana_db` y 10 tablas creadas con éxito.\n');

        // Seleccionar base de datos
        await connection.changeUser({ database: process.env.DB_NAME || 'tienda_diana_db' });

        console.log('3. Ejecutando database/seeds.sql con contraseñas seguras (bcrypt)...');
        const seedsPath = path.resolve(__dirname, '../../../database/seeds.sql');
        let seedsSql = fs.readFileSync(seedsPath, 'utf8');

        // Generar hashes reales con bcrypt para mayor compatibilidad
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('Admin123*', salt);
        const cajeroHash = await bcrypt.hash('Cajero123*', salt);

        // Reemplazar hashes en el script
        seedsSql = seedsSql.replace("'$2a$10$Pj0kY1lU0cO2N4XgRk8x.OPo8l1Lrq2Tf06U.Z8QyC6M9rJd5L6g.'", `'${adminHash}'`);
        seedsSql = seedsSql.replace("'$2a$10$Pj0kY1lU0cO2N4XgRk8x.OPo8l1Lrq2Tf06U.Z8QyC6M9rJd5L6g.'", `'${cajeroHash}'`);

        await connection.query(seedsSql);
        console.log('   [OK] Datos iniciales cargados (Categorías, Usuarios, Prenda con variantes y Kardex).\n');

        console.log('4. Verificando conteo de tablas creadas:');
        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
            ORDER BY table_name
        `, [process.env.DB_NAME || 'tienda_diana_db']);

        console.table(tables);

        console.log('\n====================================================');
        console.log('¡BASE DE DATOS TIENDADIANA LISTA Y VERIFICADA!');
        console.log('Usuarios creados:');
        console.log(' - Administrador: admin@tiendadiana.com / Clave: Admin123*');
        console.log(' - Cajera:        cajero@tiendadiana.com / Clave: Cajero123*');
        console.log('====================================================');

    } catch (error) {
        console.error('\n[ERROR INICIALIZANDO BD]:', error.message);
        process.exitCode = 1;
        console.error('Verifique sus credenciales en backend/.env y que el servicio MySQL esté corriendo.');
    } finally {
        if (connection) await connection.end();
    }
}

initDatabase();
