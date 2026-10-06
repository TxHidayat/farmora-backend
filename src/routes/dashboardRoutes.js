const express = require('express');

const {
    getDashboard,
    getFinanceChart
} = require('../controllers/dashboardController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();


// Dashboard membutuhkan JWT
router.use(authenticateToken);


// GET dashboard
router.get('/', getDashboard);


// GET finance chart
router.get('/finance-chart', getFinanceChart);


module.exports = router;