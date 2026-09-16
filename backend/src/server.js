const app = require('./app');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection, closePool } = require('./config/db');

// ✅ Cargar .env según entorno
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
} else {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const PORT = process.env.PORT || 5000;

/**
 * Valida la configuración de producción
 */
function validateProductionConfiguration() {
    if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  Modo desarrollo - validaciones de producción omitidas');
        return;
    }

    console.log('🔍 Validando configuración de producción...');

    // 1. Validar JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret.length < 32) {
        throw new Error('❌ JWT_SECRET debe tener al menos 32 caracteres en producción.');
    }
    if (jwtSecret === 'super_secreto_tiendadiana_jwt_key_2026') {
        throw new Error('❌ JWT_SECRET no puede ser el valor por defecto.');
    }
    console.log('   ✅ JWT_SECRET válido');

    // 2. Validar CORS_ORIGINS
    if (!process.env.CORS_ORIGINS) {
        throw new Error('❌ CORS_ORIGINS es obligatorio en producción.');
    }
    const origins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
    if (origins.length === 0) {
        throw new Error('❌ CORS_ORIGINS debe tener al menos un origen permitido.');
    }
    console.log(`   ✅ CORS_ORIGINS: ${origins.join(', ')}`);

    // 3. Validar usuario MySQL
    if (!process.env.DB_USER || process.env.DB_USER === 'root') {
        throw new Error('❌ Configure un usuario MySQL exclusivo para la aplicación.');
    }
    console.log(`   ✅ DB_USER: ${process.env.DB_USER}`);

    // 4. Validar DB_PASSWORD
    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < 8) {
        throw new Error('❌ DB_PASSWORD debe tener al menos 8 caracteres.');
    }
    console.log('   ✅ DB_PASSWORD válida');

    console.log('✅ Validaciones de producción completadas.');
}

/**
 * Inicia el servidor
 */
async function startServer() {
    try {
        console.log('========================================');
        console.log('   🚀 INICIANDO TIENDADIANA BACKEND');
        console.log(`   📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log('========================================\n');

        validateProductionConfiguration();

        // Test de conexión a MySQL
        console.log('📡 Probando conexión a MySQL...');
        const connected = await testConnection();
        if (!connected) {
            throw new Error('❌ No fue posible conectar a MySQL.');
        }
        console.log('✅ Conexión a MySQL establecida.\n');

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            console.log('======================================================');
            console.log(`✅ SERVIDOR TIENDADIANA EN PUERTO ${PORT}`);
            console.log(`   🌐 Local:    http://localhost:${PORT}`);
            console.log(`   🏥 Health:   http://localhost:${PORT}/api/health`);
            console.log(`   🔒 Modo:     ${process.env.NODE_ENV === 'production' ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
            console.log('======================================================\n');
        });

        // Cierre seguro
        const shutdown = async (signal) => {
            console.log(`\n📌 ${signal} recibido. Cerrando servidor...`);
            server.close(async () => {
                console.log('📡 Cerrando conexiones a MySQL...');
                await closePool();
                console.log('👋 Servidor cerrado exitosamente.');
                process.exit(0);
            });
        };

        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGTERM', () => shutdown('SIGTERM'));

        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            console.error('💥 Error no capturado:', error);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason) => {
            console.error('💥 Promesa rechazada no manejada:', reason);
        });

    } catch (error) {
        console.error('❌ No se pudo iniciar el backend:', error.message);
        process.exit(1);
    }
}

startServer();