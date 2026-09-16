const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/adjust', authenticate, authorize(['admin']), inventoryController.adjustStock);
router.get('/kardex', authenticate, inventoryController.getKardex);

module.exports = router;

