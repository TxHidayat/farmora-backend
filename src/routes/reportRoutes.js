const express = require('express');

const {
    getReportSummary,
    getHarvestReport,
    getExpenseReport
} = require('../controllers/reportController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(demoBlockMiddleware);

router.get('/summary', getReportSummary);
router.get('/harvests', getHarvestReport);
router.get('/expenses', getExpenseReport);

module.exports = router;