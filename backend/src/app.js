const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar rutas
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const categoriesRoutes = require('./routes/categories.routes');
const productsRoutes = require('./routes/products.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const cashRoutes = require('./routes/cash.routes');
const salesRoutes = require('./routes/sales.routes');
const settingsRoutes = require('./routes/settings.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// ✅ Seguridad
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// ✅ Helmet
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' }
}));

// ✅ CORS restringido
app.use(cors({
    origin(origin, callback) {
        // Permitir peticiones sin origen (Postman, móviles)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || !isProduction) {
            return callback(null, true);
        }
        return callback(new Error('Origen no autorizado por CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 horas
}));

// ✅ Rate Limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number.parseInt(process.env.API_RATE_LIMIT || '100', 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.' 
    }
}));

// ✅ Body parsers con límite
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ limit: '3mb', extended: true }));

// ✅ Rutas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// ✅ 404 - Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

// ✅ Manejador global de errores
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'Error interno del servidor.' : (err.message || 'Error interno del servidor.')
    });
});

module.exports = app;