const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', categoriesController.getCategories);
router.post('/', authenticate, authorize(['admin']), categoriesController.createCategory);
router.put('/:id', authenticate, authorize(['admin']), categoriesController.updateCategory);
router.delete('/:id', authenticate, authorize(['admin']), categoriesController.deleteCategory);

module.exports = router;
