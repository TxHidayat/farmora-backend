const express = require('express');

const {
    getWeather,
} = require('../controllers/weatherController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(demoBlockMiddleware);

router.get('/', getWeather);

module.exports = router;