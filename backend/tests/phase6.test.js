// Phase 6 verification test (Reviews & Rating Calculation)
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Transaction = require('../src/models/Transaction');
const Review = require('../src/models/Review');

async function testPhase6() {
  console.log('--- Starting Phase 6 (Reviews & Rating Calculation) Integration Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('1. Database connected.');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/reviews', require('../src/routes/reviewRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/reviews`;

  const ownerEmail = `owner_p6_${Date.now()}@example.com`;
  const borrowerEmail = `borrower_p6_${Date.now()}@example.com`;
  const outsiderEmail = `outsider_p6_${Date.now()}@example.com`;

  let owner, borrower, outsider, ownerToken, borrowerToken, outsiderToken, item, tx;

  try {
    owner = await User.create({ name: 'Owner P6', email: ownerEmail, password: 'password123', rating: 5.0, ratingCount: 0 });
    borrower = await User.create({ name: 'Borrower P6', email: borrowerEmail, password: 'password123' });
    outsider = await User.create({ name: 'Outsider P6', email: outsiderEmail, password: 'password123' });

    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    borrowerToken = jwt.sign({ id: borrower._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    outsiderToken = jwt.sign({ id: outsider._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    item = await Item.create({
      ownerId: owner._id,
      title: 'Guitar Acoustic',
      description: 'Yamaha acoustic guitar',
      category: 'Music',
      condition: 'Good',
      pricePerDay: 10,
      securityDeposit: 30,
      location: 'Dorm Room 102'
    });

    tx = await Transaction.create({
      itemId: item._id,
      ownerId: owner._id,
      borrowerId: borrower._id,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-03'),
      status: 'ACTIVE'
    });

    // 1. Cannot review ACTIVE transaction
    const resActiveReview = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
      body: JSON.stringify({ transactionId: tx._id, rating: 4, comment: 'Great!' })
    });
    console.log('2. Review active transaction status:', resActiveReview.status);
    if (resActiveReview.status !== 400) throw new Error('Expected 400 for reviewing active transaction');

    // Mark transaction COMPLETED
    tx.status = 'COMPLETED';
    tx.returnedAt = new Date();
    await tx.save();

    // 2. Outsider cannot review
    const resOutsiderReview = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${outsiderToken}` },
      body: JSON.stringify({ transactionId: tx._id, rating: 5, comment: 'Nice!' })
    });
    console.log('3. Outsider review status:', resOutsiderReview.status);
    if (resOutsiderReview.status !== 403) throw new Error('Expected 403 for outsider review');

    // 3. Valid review by borrower
    const resValidReview = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
      body: JSON.stringify({
        transactionId: tx._id,
        rating: 4,
        comment: 'Great guitar, owner was punctual and polite!'
      })
    });
    const reviewData = await resValidReview.json();
    console.log('4. Valid review status:', resValidReview.status, 'Rating:', reviewData.rating);
    if (resValidReview.status !== 201 || !reviewData._id) throw new Error('Valid review creation failed');

    // 4. Verify owner rating calculation: initial count 0 + 4 star review = rating 4.0, count 1
    const updatedOwner = await User.findById(owner._id);
    console.log('5. Owner updated rating:', updatedOwner.rating, 'Rating count:', updatedOwner.ratingCount);
    if (updatedOwner.rating !== 4.0 || updatedOwner.ratingCount !== 1) {
      throw new Error(`Expected owner rating 4.0 and count 1, got ${updatedOwner.rating} and ${updatedOwner.ratingCount}`);
    }

    // 5. Duplicate review by borrower on same transaction rejected
    const resDupReview = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${borrowerToken}` },
      body: JSON.stringify({
        transactionId: tx._id,
        rating: 5,
        comment: 'Duplicate attempt'
      })
    });
    console.log('6. Duplicate review status:', resDupReview.status);
    if (resDupReview.status !== 400) throw new Error('Expected 400 for duplicate review');

    // 6. Get reviews for owner
    const resGetReviews = await fetch(`${baseUrl}/${owner._id}`);
    const dataReviews = await resGetReviews.json();
    console.log('7. Get reviews for owner count:', dataReviews.length);
    if (resGetReviews.status !== 200 || dataReviews.length === 0) throw new Error('Failed to fetch reviews');

    console.log('--- Phase 6 Reviews & Rating Calculation Passed Successfully! ---');
  } finally {
    console.log('Cleaning up test data...');
    if (tx) {
      await Review.deleteMany({ transactionId: tx._id });
      await Transaction.deleteOne({ _id: tx._id });
    }
    if (item) await Item.deleteOne({ _id: item._id });
    if (owner) await User.deleteOne({ _id: owner._id });
    if (borrower) await User.deleteOne({ _id: borrower._id });
    if (outsider) await User.deleteOne({ _id: outsider._id });
    server.close();
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

testPhase6().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 6 test failed:', err);
  process.exit(1);
});
