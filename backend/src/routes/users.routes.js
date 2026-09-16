const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize(['admin']), usersController.getUsers);
router.post('/', authenticate, authorize(['admin']), usersController.createUser);
router.put('/:id', authenticate, authorize(['admin']), usersController.updateUser);
router.delete('/:id', authenticate, authorize(['admin']), usersController.deleteUser);

module.exports = router;
