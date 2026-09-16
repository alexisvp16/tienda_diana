const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);
router.post('/', authenticate, authorize(['admin']), productsController.createProduct);
router.put('/:id', authenticate, authorize(['admin']), productsController.updateProduct);
router.delete('/:id', authenticate, authorize(['admin']), productsController.deleteProduct);

module.exports = router;
