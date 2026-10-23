const express = require('express');

const {
    getHarvests,
    getHarvestById,
    createHarvest,
    updateHarvest,
    deleteHarvest
} = require('../controllers/harvestController');

const authenticateToken = require('../middleware/authMiddleware');
const { demoBlockMiddleware } = require('../middleware/demoMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(demoBlockMiddleware);

router.get('/', getHarvests);
router.get('/:id', getHarvestById);
router.post('/', createHarvest);
router.put('/:id', updateHarvest);
router.delete('/:id', deleteHarvest);

module.exports = router;