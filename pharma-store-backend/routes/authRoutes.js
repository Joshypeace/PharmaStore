const express = require('express');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', authController.protect, authController.getCurrentUser );
router.get('/dashboard-stats', authController.protect, dashboardController.getDashboardStats);

module.exports = router;