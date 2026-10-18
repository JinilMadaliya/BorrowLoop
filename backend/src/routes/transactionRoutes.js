const express = require('express');
const router = express.Router();
const {
  getUserTransactions,
  getTransactionById,
  completeTransaction,
  cancelTransaction,
  reportOverdue
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUserTransactions);
router.get('/:id', getTransactionById);
router.put('/:id/complete', completeTransaction);
router.put('/:id/cancel', cancelTransaction);
router.put('/:id/report-overdue', reportOverdue);

module.exports = router;
