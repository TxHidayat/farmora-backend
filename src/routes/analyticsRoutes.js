const express = require('express');

const {
    getAnalyticsSummary,
    getProductivityAnalytics,
    getExpenseAnalytics,
    getFarmAnalytics
} = require('../controllers/analyticsController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Semua analytics membutuhkan JWT
router.use(authenticateToken);

// Ringkasan analytics
router.get(
    '/summary',
    getAnalyticsSummary
);

// Produktivitas tanaman
router.get(
    '/productivity',
    getProductivityAnalytics
);

// Analisis pengeluaran
router.get(
    '/expenses',
    getExpenseAnalytics
);

// Analisis per kebun
router.get(
    '/farms',
    getFarmAnalytics
);

module.exports = router;