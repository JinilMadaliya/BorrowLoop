const mongoose = require('mongoose');
const BorrowRequest = require('../models/BorrowRequest');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');

// @desc    Create a new borrow request
// @route   POST /api/borrow-requests
// @access  Private
const createBorrowRequest = async (req, res) => {
  try {
    const { itemId, startDate, endDate, message } = req.body;

    if (!itemId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Please provide itemId, startDate, and endDate' });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(404).json({ message: 'Invalid item ID' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Business Rule: Item must not be set to UNAVAILABLE
    if (item.status === 'UNAVAILABLE') {
      return res.status(400).json({ message: 'This item is currently marked as unavailable by the owner' });
    }

    // Business Rule: A user cannot borrow their own item
    if (item.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot borrow your own item' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date format' });
    }

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be strictly after start date' });
    }

    // Boundary check for half-open intervals [startDate, endDate)
    // Conflicting booking exists if (existingStart < requestedEnd) AND (existingEnd > requestedStart)
    const overlappingRequest = await BorrowRequest.findOne({
      itemId: item._id,
      status: 'APPROVED',
      startDate: { $lt: end },
      endDate: { $gt: start }
    });

    if (overlappingRequest) {
      return res.status(400).json({ message: 'Item is already booked for these dates' });
    }

    const borrowRequest = await BorrowRequest.create({
      itemId: item._id,
      ownerId: item.ownerId,
      borrowerId: req.user._id,
      startDate: start,
      endDate: end,
      message: message ? message.trim() : ''
    });

    res.status(201).json(borrowRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Get requests for logged-in user (as borrower or owner)
// @route   GET /api/borrow-requests
// @access  Private
const getUserBorrowRequests = async (req, res) => {
  try {
    // Find requests where user is either the borrower or the owner
    const requests = await BorrowRequest.find({
      $or: [{ borrowerId: req.user._id }, { ownerId: req.user._id }]
    })
      .populate('itemId', 'title images pricePerDay securityDeposit location status')
      .populate('borrowerId', 'name rating ratingCount profileImage email')
      .populate('ownerId', 'name rating ratingCount profileImage email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Approve a borrow request & create transaction
// @route   PUT /api/borrow-requests/:id/approve
// @access  Private
const approveBorrowRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    const request = await BorrowRequest.findById(req.params.id).populate('itemId');

    if (!request) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    // Only pending requests can be approved
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot approve request with status '${request.status}'` });
    }

    // Only the item owner can approve
    if (request.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve this request' });
    }

    // Double check overlap against all approved bookings excluding current request
    const overlappingRequest = await BorrowRequest.findOne({
      _id: { $ne: request._id },
      itemId: request.itemId._id,
      status: 'APPROVED',
      startDate: { $lt: request.endDate },
      endDate: { $gt: request.startDate }
    });

    if (overlappingRequest) {
      return res.status(400).json({
        message: 'Cannot approve: Date overlap with an existing approved booking'
      });
    }

    request.status = 'APPROVED';
    await request.save();

    // Set item status to BORROWED
    if (request.itemId) {
      request.itemId.status = 'BORROWED';
      await request.itemId.save();
    }

    // Calculate total price based on duration in days
    const diffTime = Math.abs(new Date(request.endDate) - new Date(request.startDate));
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalAmount = diffDays * (request.itemId.pricePerDay || 0);

    // Create active transaction record
    const transaction = await Transaction.create({
      itemId: request.itemId._id,
      ownerId: request.ownerId,
      borrowerId: request.borrowerId,
      startDate: request.startDate,
      endDate: request.endDate,
      amount: totalAmount,
      deposit: request.itemId.securityDeposit || 0,
      conditionBefore: request.itemId.condition || 'Good'
    });

    res.json({ message: 'Request approved and transaction created', request, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Reject a borrow request
// @route   PUT /api/borrow-requests/:id/reject
// @access  Private
const rejectBorrowRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    // Only pending requests can be rejected
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot reject request with status '${request.status}'` });
    }

    if (request.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    request.status = 'REJECTED';
    await request.save();

    res.json({ message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Cancel a pending borrow request (by borrower)
// @route   PUT /api/borrow-requests/:id/cancel
// @access  Private
const cancelBorrowRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    if (request.borrowerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    }

    request.status = 'CANCELLED';
    await request.save();

    res.json({ message: 'Borrow request cancelled successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Mark transaction as returned/completed
// @route   PUT /api/transactions/:id/complete
// @access  Private
const completeTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('itemId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Only owner or borrower can mark as returned
    if (
      transaction.ownerId.toString() !== req.user._id.toString() &&
      transaction.borrowerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to complete this transaction' });
    }

    transaction.status = 'COMPLETED';
    transaction.returnedAt = Date.now();
    await transaction.save();

    // Make the item available again
    if (transaction.itemId) {
      transaction.itemId.status = 'AVAILABLE';
      await transaction.itemId.save();
    }

    res.json({ message: 'Transaction marked as completed and item is now available', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  createBorrowRequest,
  getUserBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  cancelBorrowRequest,
  completeTransaction
};