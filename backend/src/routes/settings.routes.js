const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', settingsController.getSettings);
router.put('/', authenticate, authorize(['admin']), settingsController.updateSettings);

module.exports = router;
