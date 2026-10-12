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

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BorrowLoop API!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add this under your other requires:
const authRoutes = require('./routes/authRoutes');

// Add this under your other app.use() middleware lines:
app.use('/api/auth', authRoutes);

// Add require under authRoutes:
const itemRoutes = require('./routes/itemRoutes');

// Add middleware under app.use('/api/auth', authRoutes):
app.use('/api/items', itemRoutes);

const borrowRoutes = require('./routes/borrowRoutes');

// Add middleware under app.use('/api/items', itemRoutes):
app.use('/api/borrow-requests', borrowRoutes);