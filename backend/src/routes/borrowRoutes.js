const express = require('express');
const router = express.Router();
const {
  createBorrowRequest,
  getUserBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest
} = require('../controllers/borrowController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createBorrowRequest).get(protect, getUserBorrowRequests);
router.put('/:id/approve', protect, approveBorrowRequest);
router.put('/:id/reject', protect, rejectBorrowRequest);

module.exports = router;