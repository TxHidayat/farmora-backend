const express = require('express');

const {
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');

const authenticateToken =
    require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getExpenses);

router.get('/:id', getExpenseById);

router.post('/', createExpense);

router.put('/:id', updateExpense);

router.delete('/:id', deleteExpense);

module.exports = router;