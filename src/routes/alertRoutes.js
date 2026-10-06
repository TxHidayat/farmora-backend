const express = require('express');

const {
    getAlerts,
} = require('../controllers/alertController');

const authenticateToken =
    require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get(
    '/',
    getAlerts
);

module.exports = router;