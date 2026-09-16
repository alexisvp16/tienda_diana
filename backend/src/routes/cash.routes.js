const express = require('express');
const router = express.Router();
const cashController = require('../controllers/cash.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Turnos y arqueos
router.post('/open', authenticate, cashController.openShift);
router.get('/current', authenticate, cashController.getCurrentShift);
router.post('/movement', authenticate, cashController.addMovement);
router.post('/close', authenticate, cashController.closeShift);
router.get('/history', authenticate, authorize(['admin']), cashController.getShiftHistory);

// Gestión de cajas físicas (Admin)
router.get('/registers', authenticate, cashController.getCashRegisters);
router.post('/registers', authenticate, authorize(['admin']), cashController.createCashRegister);
router.put('/registers/:id', authenticate, authorize(['admin']), cashController.updateCashRegister);
router.delete('/registers/:id', authenticate, authorize(['admin']), cashController.deleteCashRegister);

module.exports = router;
