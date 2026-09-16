const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Demasiados intentos de acceso. Espere 15 minutos e intente otra vez.' }
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
