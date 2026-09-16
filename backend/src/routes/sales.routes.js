const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/', authenticate, salesController.createSale);
router.get('/', authenticate, salesController.getSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.post('/:id/cancel', authenticate, authorize(['admin']), salesController.cancelSale);

module.exports = router;

