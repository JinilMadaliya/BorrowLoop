const mongoose = require('mongoose');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Create a review for a completed transaction
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { transactionId, rating, comment } = req.body;

    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ message: 'Valid transaction ID is required' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer or decimal between 1 and 5' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Feedback comment is required' });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'You can only review completed transactions' });
    }

    // Determine who is reviewing whom
    let revieweeId;
    if (req.user._id.toString() === transaction.borrowerId.toString()) {
      revieweeId = transaction.ownerId; // Borrower reviewing owner
    } else if (req.user._id.toString() === transaction.ownerId.toString()) {
      revieweeId = transaction.borrowerId; // Owner reviewing borrower
    } else {
      return res.status(403).json({ message: 'You are not part of this transaction' });
    }

    // Check if user already reviewed this transaction
    const existingReview = await Review.findOne({
      transactionId,
      reviewerId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this transaction' });
    }

    const review = await Review.create({
      itemId: transaction.itemId,
      transactionId,
      reviewerId: req.user._id,
      revieweeId,
      rating: numRating,
      comment: comment.trim()
    });

    // Update reviewee's dynamic average rating correctly
    const userToRate = await User.findById(revieweeId);
    if (userToRate) {
      if (userToRate.ratingCount === 0) {
        userToRate.rating = Number(numRating.toFixed(1));
        userToRate.ratingCount = 1;
      } else {
        const currentCount = userToRate.ratingCount;
        const currentRating = userToRate.rating;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + numRating) / newCount;

        userToRate.rating = Number(newRating.toFixed(1));
        userToRate.ratingCount = newCount;
      }
      await userToRate.save();
    }

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this transaction' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Get reviews for a specific user or item
// @route   GET /api/reviews/:targetId (can be userId or itemId)
// @access  Public
const getReviews = async (req, res) => {
  try {
    const { targetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid target ID' });
    }

    const reviews = await Review.find({
      $or: [{ revieweeId: targetId }, { itemId: targetId }]
    })
      .populate('reviewerId', 'name profileImage rating')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  createReview,
  getReviews
};