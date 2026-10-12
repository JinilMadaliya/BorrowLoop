const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Import Route Files
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); // <-- Added Review Routes

// Mount Routes (Connecting URLs to Route Handlers)
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/borrow-requests', borrowRoutes);
app.use('/api/reviews', reviewRoutes); // <-- Mounted here! All review requests go to /api/reviews/...

// Transaction Complete Route
app.put('/api/transactions/:id/complete', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const Transaction = require('./models/Transaction');
    const transaction = await Transaction.findById(req.params.id).populate('itemId');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (
      transaction.ownerId.toString() !== req.user._id.toString() &&
      transaction.borrowerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to complete this transaction' });
    }

    transaction.status = 'COMPLETED';
    transaction.returnedAt = Date.now();
    await transaction.save();

    if (transaction.itemId) {
      transaction.itemId.status = 'AVAILABLE';
      await transaction.itemId.save();
    }

    res.json({ message: 'Transaction marked as completed and item is now available', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BorrowLoop API!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});