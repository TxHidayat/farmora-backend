const express = require('express');

const {
    getFields,
    getFieldById,
    createField,
    updateField,
    deleteField
} = require('../controllers/fieldController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Semua endpoint field membutuhkan JWT
router.use(authenticateToken);

// GET semua lahan
router.get('/', getFields);

// GET detail lahan
router.get('/:id', getFieldById);

// POST tambah lahan
router.post('/', createField);

// PUT edit lahan
router.put('/:id', updateField);

// DELETE hapus lahan
router.delete('/:id', deleteField);

module.exports = router;