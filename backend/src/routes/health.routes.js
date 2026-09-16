const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * @route   GET /api/health
 * @desc    Health check del sistema
 * @access  Public
 */
router.get('/', async (req, res) => {
    let dbStatus = 'disconnected';
    let dbError = null;

    try {
        const [result] = await db.query('SELECT 1 AS result');
        if (result && result.length > 0) dbStatus = 'connected';
    } catch (error) {
        dbStatus = 'error';
        dbError = error.message;
    }

    const isHealthy = dbStatus === 'connected';
    
    // ✅ Respuesta BASE (segura para todos los entornos)
    const response = {
        success: isHealthy,
        system: 'TIENDADIANA Backend REST API',
        version: process.env.npm_package_version || '1.0.0',
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: { 
            status: dbStatus 
        }
    };

    // ✅ Solo en desarrollo mostrar detalles técnicos
    if (process.env.NODE_ENV !== 'production') {
        response.database.name = process.env.DB_NAME || 'tienda_diana_db';
        response.database.host = process.env.DB_HOST || '127.0.0.1';
        response.database.port = process.env.DB_PORT || 3306;
        response.database.user = process.env.DB_USER || 'root';
        if (dbError) response.database.error = dbError;
    }

    // ✅ En producción NO se muestra: host, puerto, usuario, nombre DB, errores

    return res.status(isHealthy ? 200 : 503).json(response);
});

module.exports = router;