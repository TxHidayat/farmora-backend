const express = require('express');

const {
    getReportSummary,
    getHarvestReport,
    getExpenseReport
} = require('../controllers/reportController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/summary', getReportSummary);
router.get('/harvests', getHarvestReport);
router.get('/expenses', getExpenseReport);

module.exports = router;