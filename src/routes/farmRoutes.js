const express = require('express');

const {
    getFarms,
    getFarmById,
    createFarm,
    updateFarm,
    deleteFarm
} = require('../controllers/farmController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

// Semua endpoint farm membutuhkan JWT dan pembatasan demo
router.use(authenticateToken);
router.use(demoBlockMiddleware);

// GET semua kebun user
router.get('/', getFarms);

// GET detail kebun
router.get('/:id', getFarmById);

// POST tambah kebun
router.post('/', createFarm);

// PUT edit kebun
router.put('/:id', updateFarm);

// DELETE hapus kebun
router.delete('/:id', deleteFarm);

module.exports = router;