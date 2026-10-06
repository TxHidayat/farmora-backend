const express = require('express');

const {
    getFarms,
    getFarmById,
    createFarm,
    updateFarm,
    deleteFarm
} = require('../controllers/farmController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Semua endpoint farm membutuhkan JWT
router.use(authenticateToken);

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