const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  images: {
    type: [String],
    default: []
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair'],
    required: true
  },
  pricePerDay: {
    type: Number,
    default: 0 // Optional paid borrowing support
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'BORROWED', 'UNAVAILABLE'],
    default: 'AVAILABLE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', itemSchema);