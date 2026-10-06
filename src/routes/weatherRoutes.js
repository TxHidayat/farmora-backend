const express = require('express');

const {
    getWeather,
} = require('../controllers/weatherController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getWeather);

module.exports = router;