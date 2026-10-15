// Phase 5 verification test (Transactions & Return Flow)
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Transaction = require('../src/models/Transaction');

async function testPhase5() {
  console.log('--- Starting Phase 5 (Transactions & Return Flow) Integration Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('1. Database connected.');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/transactions', require('../src/routes/transactionRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/transactions`;

  const ownerEmail = `owner_p5_${Date.now()}@example.com`;
  const borrowerEmail = `borrower_p5_${Date.now()}@example.com`;
  const bystanderEmail = `bystander_p5_${Date.now()}@example.com`;

  let owner, borrower, bystander, ownerToken, borrowerToken, bystanderToken, item, tx;

  try {
    owner = await User.create({ name: 'Owner P5', email: ownerEmail, password: 'password123', location: 'Dorm A' });
    borrower = await User.create({ name: 'Borrower P5', email: borrowerEmail, password: 'password123', location: 'Dorm B' });
    bystander = await User.create({ name: 'Bystander P5', email: bystanderEmail, password: 'password123', location: 'Dorm C' });

    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    borrowerToken = jwt.sign({ id: borrower._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    bystanderToken = jwt.sign({ id: bystander._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    item = await Item.create({
      ownerId: owner._id,
      title: 'Drill Machine Dewalt',
      description: 'Heavy duty drill',
      category: 'Tools',
      condition: 'Like New',
      pricePerDay: 20,
      securityDeposit: 40,
      location: 'Campus Workshop',
      status: 'BORROWED' // Marked borrowed because transaction is active
    });

    tx = await Transaction.create({
      itemId: item._id,
      ownerId: owner._id,
      borrowerId: borrower._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 3),
      amount: 60,
      deposit: 40,
      status: 'ACTIVE',
      conditionBefore: 'Like New'
    });

    // 1. GET /api/transactions without token
    const resNoToken = await fetch(baseUrl);
    console.log('2. GET transactions no token status:', resNoToken.status);
    if (resNoToken.status !== 401) throw new Error('Expected 401 for missing token');

    // 2. GET /api/transactions with borrower token
    const resGetTx = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${borrowerToken}` }
    });
    const dataGetTx = await resGetTx.json();
    console.log('3. GET transactions count for borrower:', dataGetTx.length);
    if (resGetTx.status !== 200 || dataGetTx.length === 0) throw new Error('Failed to get transactions');

    // 3. GET /api/transactions/:id with bystander token (Forbidden)
    const resBystanderGet = await fetch(`${baseUrl}/${tx._id}`, {
      headers: { Authorization: `Bearer ${bystanderToken}` }
    });
    console.log('4. Bystander get transaction detail status:', resBystanderGet.status);
    if (resBystanderGet.status !== 403) throw new Error('Expected 403 for bystander');

    // 4. GET /api/transactions/:id with owner token
    const resOwnerGet = await fetch(`${baseUrl}/${tx._id}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const dataOwnerGet = await resOwnerGet.json();
    console.log('5. Owner get transaction detail status:', resOwnerGet.status, 'Title:', dataOwnerGet.itemId?.title);
    if (resOwnerGet.status !== 200 || dataOwnerGet.itemId?.title !== 'Drill Machine Dewalt') {
      throw new Error('Owner get transaction detail failed');
    }

    // 5. Bystander tries to complete transaction (Forbidden)
    const resBystanderComplete = await fetch(`${baseUrl}/${tx._id}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${bystanderToken}` }
    });
    console.log('6. Bystander complete transaction status:', resBystanderComplete.status);
    if (resBystanderComplete.status !== 403) throw new Error('Expected 403 for bystander complete');

    // 6. Owner completes transaction
    const resComplete = await fetch(`${baseUrl}/${tx._id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ conditionAfter: 'Good - minor wear' })
    });
    const dataComplete = await resComplete.json();
    console.log('7. Owner complete status:', resComplete.status, 'Tx Status:', dataComplete.transaction?.status);
    if (resComplete.status !== 200 || dataComplete.transaction?.status !== 'COMPLETED') {
      throw new Error('Complete transaction failed');
    }

    // Check item status is now AVAILABLE
    const releasedItem = await Item.findById(item._id);
    console.log('8. Item status after completion:', releasedItem.status);
    if (releasedItem.status !== 'AVAILABLE') throw new Error('Item was not released back to AVAILABLE');

    // 7. Repeated completion attempt should be rejected
    const resRepeatedComplete = await fetch(`${baseUrl}/${tx._id}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('9. Repeated completion status:', resRepeatedComplete.status);
    if (resRepeatedComplete.status !== 400) throw new Error('Expected 400 for repeated completion');

    console.log('--- Phase 5 Transactions & Return Flow Passed Successfully! ---');
  } finally {
    console.log('Cleaning up test data...');
    if (tx) await Transaction.deleteOne({ _id: tx._id });
    if (item) await Item.deleteOne({ _id: item._id });
    if (owner) await User.deleteOne({ _id: owner._id });
    if (borrower) await User.deleteOne({ _id: borrower._id });
    if (bystander) await User.deleteOne({ _id: bystander._id });
    server.close();
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

testPhase5().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 5 test failed:', err);
  process.exit(1);
});
