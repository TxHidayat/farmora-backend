const express = require('express');

const authenticateToken =
    require('../middleware/authMiddleware');

const {
    demoBlockMiddleware,
    demoAiBlockMiddleware
} = require('../middleware/demoMiddleware');

const upload =
    require('../middleware/quickScanUploadMiddleware');

const {
    quickPlantScan,
    getQuickScans,
    deleteQuickScan,
    deleteAllQuickScans,
} = require('../controllers/quickScanController');

const router = express.Router();

// =========================================================
// AUTHENTICATION & DEMO RESTRICTION
// =========================================================

router.use(
    authenticateToken
);

router.use(
    demoBlockMiddleware
);

// =========================================================
// QUICK PLANT SCAN
// =========================================================

router.post(
    '/quick-scan',
    demoAiBlockMiddleware,
    upload.single('image'),
    quickPlantScan
);

// =========================================================
// GET HISTORY
// =========================================================

router.get(
    '/quick-scans',
    getQuickScans
);

// =========================================================
// DELETE ALL HISTORY
// =========================================================

router.delete(
    '/quick-scans',
    deleteAllQuickScans
);

// =========================================================
// DELETE ONE HISTORY
// =========================================================

router.delete(
    '/quick-scans/:id',
    deleteQuickScan
);

module.exports = router;