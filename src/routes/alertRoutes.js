const express = require('express');

const {
    getAlerts,
} = require('../controllers/alertController');

const authenticateToken =
    require('../middleware/authMiddleware');
const { demoBlockMiddleware } =
    require('../middleware/demoMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(demoBlockMiddleware);

router.get(
    '/',
    getAlerts
);

module.exports = router;