// Phase 4 verification test (Borrow requests, state guards, and date overlap engine)
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const BorrowRequest = require('../src/models/BorrowRequest');
const Transaction = require('../src/models/Transaction');

async function testPhase4() {
  console.log('--- Starting Phase 4 (Borrow Requests & Overlap Engine) Integration Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('1. Database connected.');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/borrow-requests', require('../src/routes/borrowRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/borrow-requests`;

  const ownerEmail = `owner_p4_${Date.now()}@example.com`;
  const borrower1Email = `b1_p4_${Date.now()}@example.com`;
  const borrower2Email = `b2_p4_${Date.now()}@example.com`;

  let owner, borrower1, borrower2, ownerToken, b1Token, b2Token, item;

  try {
    owner = await User.create({ name: 'Owner P4', email: ownerEmail, password: 'password123', location: 'Dorm 1' });
    borrower1 = await User.create({ name: 'Borrower 1', email: borrower1Email, password: 'password123', location: 'Dorm 2' });
    borrower2 = await User.create({ name: 'Borrower 2', email: borrower2Email, password: 'password123', location: 'Dorm 3' });

    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    b1Token = jwt.sign({ id: borrower1._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    b2Token = jwt.sign({ id: borrower2._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    item = await Item.create({
      ownerId: owner._id,
      title: 'Camping Tent 4-Person',
      description: 'Waterproof camping tent',
      category: 'Outdoors',
      condition: 'Good',
      pricePerDay: 15,
      securityDeposit: 50,
      location: 'Campus Quad',
      status: 'AVAILABLE'
    });

    // 1. Own item borrow rejection
    const resOwnItem = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        itemId: item._id,
        startDate: '2026-11-01',
        endDate: '2026-11-05'
      })
    });
    console.log('2. Borrow own item status:', resOwnItem.status);
    if (resOwnItem.status !== 400) throw new Error('Expected 400 for borrowing own item');

    // 2. End date before start date
    const resBadDates = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b1Token}` },
      body: JSON.stringify({
        itemId: item._id,
        startDate: '2026-11-05',
        endDate: '2026-11-01'
      })
    });
    console.log('3. Bad date range status:', resBadDates.status);
    if (resBadDates.status !== 400) throw new Error('Expected 400 for invalid dates');

    // 3. Create Request 1 (Nov 1 to Nov 5) by Borrower 1
    const resReq1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b1Token}` },
      body: JSON.stringify({
        itemId: item._id,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-05T00:00:00.000Z',
        message: 'Trip to Yosemite'
      })
    });
    const req1 = await resReq1.json();
    console.log('4. Create Request 1 status:', resReq1.status, 'ID:', req1._id);
    if (resReq1.status !== 201) throw new Error('Create Request 1 failed');

    // 4. Create competing Request 2 (Nov 3 to Nov 8) by Borrower 2
    const resReq2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b2Token}` },
      body: JSON.stringify({
        itemId: item._id,
        startDate: '2026-11-03T00:00:00.000Z',
        endDate: '2026-11-08T00:00:00.000Z',
        message: 'Weekend trip'
      })
    });
    const req2 = await resReq2.json();
    console.log('5. Create competing Request 2 status:', resReq2.status, 'ID:', req2._id);
    if (resReq2.status !== 201) throw new Error('Create Request 2 failed');

    // 5. Owner approves Request 1
    const resApprove1 = await fetch(`${baseUrl}/${req1._id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const dataApprove1 = await resApprove1.json();
    console.log('6. Approve Request 1 status:', resApprove1.status, 'Tx Amount:', dataApprove1.transaction?.amount);
    if (resApprove1.status !== 200 || !dataApprove1.transaction) throw new Error('Approve Request 1 failed');

    // Check item status is now BORROWED
    const updatedItem = await Item.findById(item._id);
    console.log('7. Item status after approval:', updatedItem.status);
    if (updatedItem.status !== 'BORROWED') throw new Error('Item status was not set to BORROWED');

    // 6. Owner tries to approve competing Request 2 (must be rejected due to overlap)
    const resApprove2 = await fetch(`${baseUrl}/${req2._id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('8. Competing approval status:', resApprove2.status);
    if (resApprove2.status !== 400) throw new Error('Expected 400 when approving overlapping booking');

    // 7. Owner cannot re-approve already approved Request 1
    const resReApprove1 = await fetch(`${baseUrl}/${req1._id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('9. Re-approve already approved status:', resReApprove1.status);
    if (resReApprove1.status !== 400) throw new Error('Expected 400 when re-approving');

    // 8. Half-open interval test: Request 3 starting on Nov 5 (same day Request 1 ends)
    // Nov 5 to Nov 10 does not overlap [Nov 1, Nov 5)
    const resReq3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b2Token}` },
      body: JSON.stringify({
        itemId: item._id,
        startDate: '2026-11-05T00:00:00.000Z',
        endDate: '2026-11-10T00:00:00.000Z',
        message: 'Back-to-back booking'
      })
    });
    const req3 = await resReq3.json();
    console.log('10. Back-to-back non-overlapping request status:', resReq3.status, 'ID:', req3._id);
    if (resReq3.status !== 201) throw new Error('Failed to create non-overlapping back-to-back booking');

    // 9. Cancel test: Borrower 2 cancels Request 3
    const resCancel = await fetch(`${baseUrl}/${req3._id}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${b2Token}` }
    });
    console.log('11. Cancel request status:', resCancel.status);
    if (resCancel.status !== 200) throw new Error('Borrower cancel failed');

    console.log('--- Phase 4 Borrow Requests & Overlap Engine Passed Successfully! ---');
  } finally {
    console.log('Cleaning up test data...');
    if (item) {
      await BorrowRequest.deleteMany({ itemId: item._id });
      await Transaction.deleteMany({ itemId: item._id });
      await Item.deleteOne({ _id: item._id });
    }
    if (owner) await User.deleteOne({ _id: owner._id });
    if (borrower1) await User.deleteOne({ _id: borrower1._id });
    if (borrower2) await User.deleteOne({ _id: borrower2._id });
    server.close();
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

testPhase4().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 4 test failed:', err);
  process.exit(1);
});
