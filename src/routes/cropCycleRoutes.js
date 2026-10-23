const express = require('express');

const {
    getCropCycles,
    getCropCycleById,
    createCropCycle,
    updateCropCycle,
    deleteCropCycle
} = require('../controllers/cropCycleController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

// Semua endpoint membutuhkan JWT dan pembatasan demo
router.use(authenticateToken);
router.use(demoBlockMiddleware);

// GET semua siklus tanaman
router.get('/', getCropCycles);

// GET detail siklus tanaman
router.get('/:id', getCropCycleById);

// POST tambah siklus tanaman
router.post('/', createCropCycle);

// PUT edit siklus tanaman
router.put('/:id', updateCropCycle);

// DELETE siklus tanaman
router.delete('/:id', deleteCropCycle);

module.exports = router;