const express = require('express');
const router = express.Router();
const {
  getUserTransactions,
  getTransactionById,
  completeTransaction
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUserTransactions);
router.get('/:id', getTransactionById);
router.put('/:id/complete', completeTransaction);

module.exports = router;
