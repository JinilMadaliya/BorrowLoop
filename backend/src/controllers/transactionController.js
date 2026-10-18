const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Get transactions for logged-in user (as owner or borrower)
// @route   GET /api/transactions
// @access  Private
const getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ ownerId: req.user._id }, { borrowerId: req.user._id }]
    })
      .populate('itemId', 'title images pricePerDay securityDeposit condition location status')
      .populate('ownerId', 'name rating ratingCount profileImage email')
      .populate('borrowerId', 'name rating ratingCount profileImage email')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Get single transaction by ID (participants only)
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate('itemId', 'title images pricePerDay securityDeposit condition location status')
      .populate('ownerId', 'name rating ratingCount profileImage email')
      .populate('borrowerId', 'name rating ratingCount profileImage email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only owner or borrower can view transaction details
    const isOwner = transaction.ownerId._id ? transaction.ownerId._id.toString() === req.user._id.toString() : transaction.ownerId.toString() === req.user._id.toString();
    const isBorrower = transaction.borrowerId._id ? transaction.borrowerId._id.toString() === req.user._id.toString() : transaction.borrowerId.toString() === req.user._id.toString();

    if (!isOwner && !isBorrower) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Mark transaction as returned/completed (by lender or borrower)
// @route   PUT /api/transactions/:id/complete
// @access  Private
const completeTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findById(req.params.id).populate('itemId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check authorization: only participants can complete
    if (
      transaction.ownerId.toString() !== req.user._id.toString() &&
      transaction.borrowerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to complete this transaction' });
    }

    // Prevent repeated completion
    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Transaction has already been completed' });
    }

    transaction.status = 'COMPLETED';
    transaction.returnedAt = new Date();

    // Calculate late return / overdue days if returned past agreed deadline
    if (transaction.returnedAt > new Date(transaction.endDate)) {
      const diffTime = transaction.returnedAt - new Date(transaction.endDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      transaction.overdueDays = diffDays;
      transaction.lateFee = diffDays * (transaction.itemId?.pricePerDay || 0);
    }

    if (req.body?.conditionAfter) {
      transaction.conditionAfter = req.body.conditionAfter.trim();
    }
    await transaction.save();

    // Release item back to AVAILABLE
    if (transaction.itemId) {
      transaction.itemId.status = 'AVAILABLE';
      await transaction.itemId.save();
    }

    res.json({
      message: 'Transaction marked as completed and item is now available',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Lender cancels rental commitment (recalls item if needed)
// @route   PUT /api/transactions/:id/cancel
// @access  Private
const cancelTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findById(req.params.id).populate('itemId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only the item owner/lender can cancel the commitment
    if (transaction.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the item lender can recall or cancel this commitment' });
    }

    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot cancel an already completed rental' });
    }

    if (transaction.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Transaction is already cancelled' });
    }

    transaction.status = 'CANCELLED';
    transaction.cancelledAt = new Date();
    transaction.cancellationReason = req.body?.reason ? req.body.reason.trim() : 'Lender recalled item for urgent personal use';
    await transaction.save();

    // Release item back to AVAILABLE
    if (transaction.itemId) {
      transaction.itemId.status = 'AVAILABLE';
      await transaction.itemId.save();
    }

    res.json({
      message: 'Rental commitment cancelled by lender. The item is now available again.',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Report an unreturned / overdue item past the deadline
// @route   PUT /api/transactions/:id/report-overdue
// @access  Private
const reportOverdue = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = await Transaction.findById(req.params.id).populate('itemId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only owner can report an unreturned item
    if (transaction.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the item owner can report an overdue return' });
    }

    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Transaction is already marked completed' });
    }

    const now = new Date();
    if (now <= new Date(transaction.endDate)) {
      return res.status(400).json({
        message: 'The rental period has not ended yet. You can only report overdue after the agreed end date.'
      });
    }

    const diffTime = now - new Date(transaction.endDate);
    const overdueDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const dailyRate = transaction.itemId?.pricePerDay || 0;
    const lateFee = overdueDays * dailyRate;

    transaction.status = 'OVERDUE';
    transaction.overdueDays = overdueDays;
    transaction.lateFee = lateFee;
    transaction.reportedOverdueAt = now;
    await transaction.save();

    // Penalize borrower's reputation and credits for not returning on time
    const borrower = await User.findById(transaction.borrowerId);
    if (borrower) {
      // Deduct borrow credits (penalty)
      borrower.borrowCredits = Math.max(0, (borrower.borrowCredits || 50) - 20);
      
      // Decrease average rating by applying a 1-star penalty to their rating count
      const currentCount = borrower.ratingCount || 1;
      const currentRating = borrower.rating || 5.0;
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + 1.0) / newCount;
      borrower.rating = Number(newRating.toFixed(1));
      borrower.ratingCount = newCount;
      
      await borrower.save();
    }

    res.json({
      message: `Item marked as OVERDUE (${overdueDays} day(s) late). Late fees of ₹${lateFee} recorded. Borrower credits and reputation have been penalized.`,
      transaction,
      depositRetained: transaction.deposit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getUserTransactions,
  getTransactionById,
  completeTransaction,
  cancelTransaction,
  reportOverdue
};
