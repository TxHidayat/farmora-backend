const express = require('express');

const {
    getDashboard,
    getFinanceChart
} = require('../controllers/dashboardController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();


// Dashboard membutuhkan JWT dan pembatasan demo
router.use(authenticateToken);
router.use(demoBlockMiddleware);


// GET dashboard
router.get('/', getDashboard);


// GET finance chart
router.get('/finance-chart', getFinanceChart);


module.exports = router;