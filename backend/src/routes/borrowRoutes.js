const express = require('express');
const router = express.Router();
const {
  createBorrowRequest,
  getUserBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  cancelBorrowRequest // <-- Make sure this is imported here
} = require('../controllers/borrowController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createBorrowRequest).get(protect, getUserBorrowRequests);
router.put('/:id/approve', protect, approveBorrowRequest);
router.put('/:id/reject', protect, rejectBorrowRequest);
router.put('/:id/cancel', protect, cancelBorrowRequest); // <-- Route wired up

module.exports = router;