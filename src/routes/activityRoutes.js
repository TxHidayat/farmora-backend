const express = require('express');

const {
    getActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity
} = require('../controllers/activityController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

// Semua endpoint membutuhkan JWT dan pembatasan demo
router.use(authenticateToken);
router.use(demoBlockMiddleware);

// GET semua aktivitas
router.get('/', getActivities);

// GET detail aktivitas
router.get('/:id', getActivityById);

// POST tambah aktivitas
router.post('/', createActivity);

// PUT edit aktivitas
router.put('/:id', updateActivity);

// DELETE aktivitas
router.delete('/:id', deleteActivity);

module.exports = router;