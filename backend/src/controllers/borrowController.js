const BorrowRequest = require('../models/BorrowRequest');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');

// @desc    Create a new borrow request
// @route   POST /api/borrow-requests
// @access  Private
const createBorrowRequest = async (req, res) => {
  try {
    const { itemId, startDate, endDate, message } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Business Rule: A user cannot borrow their own item
    if (item.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot borrow your own item' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check for overlapping APPROVED requests for this item
    const overlappingRequest = await BorrowRequest.findOne({
      itemId,
      status: 'APPROVED',
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingRequest) {
      return res.status(400).json({ message: 'Item is already booked for these dates' });
    }

    const borrowRequest = await BorrowRequest.create({
      itemId,
      ownerId: item.ownerId,
      borrowerId: req.user._id,
      startDate: start,
      endDate: end,
      message: message || ''
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
      .populate('itemId', 'title images pricePerDay location')
      .populate('borrowerId', 'name rating profileImage')
      .populate('ownerId', 'name rating profileImage');

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
    const request = await BorrowRequest.findById(req.params.id).populate('itemId');

    if (!request) {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    // Only the item owner can approve
    if (request.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve this request' });
    }

    // Double check overlap before final approval
    const overlappingRequest = await BorrowRequest.findOne({
      itemId: request.itemId._id,
      status: 'APPROVED',
      $or: [
        { startDate: { $lte: request.endDate }, endDate: { $gte: request.startDate } }
      ]
    });

    if (overlappingRequest) {
      return res.status(400).json({ message: 'Cannot approve: Date overlap with an existing approved booking' });
    }

    request.status = 'APPROVED';
    await request.save();

    // Calculate total price based on days
    const diffTime = Math.abs(new Date(request.endDate) - new Date(request.startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
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
      conditionBefore: request.itemId.condition
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
    const request = await BorrowRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Borrow request not found' });
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

module.exports = {
  createBorrowRequest,
  getUserBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest
};