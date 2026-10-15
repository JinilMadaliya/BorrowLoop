const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');

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

// @desc    Mark transaction as returned/completed
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
    transaction.returnedAt = Date.now();
    if (req.body.conditionAfter) {
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

module.exports = {
  getUserTransactions,
  getTransactionById,
  completeTransaction
};
