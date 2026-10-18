const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Item'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  borrowerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  deposit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RETURN_REQUESTED', 'COMPLETED', 'CANCELLED', 'OVERDUE'],
    default: 'ACTIVE'
  },
  conditionBefore: {
    type: String,
    default: 'Good'
  },
  conditionAfter: {
    type: String,
    default: 'Good'
  },
  overdueDays: {
    type: Number,
    default: 0
  },
  lateFee: {
    type: Number,
    default: 0
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  cancelledAt: {
    type: Date
  },
  reportedOverdueAt: {
    type: Date
  },
  returnedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);