const express = require('express');

const authenticateToken =
    require('../middleware/authMiddleware');

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
// AUTHENTICATION
// =========================================================

router.use(
    authenticateToken
);

// =========================================================
// QUICK PLANT SCAN
// =========================================================

router.post(
    '/quick-scan',
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