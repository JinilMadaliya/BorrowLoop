// Phase 3 verification test (Item CRUD & Protection)
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const Transaction = require('../src/models/Transaction');

async function testPhase3() {
  console.log('--- Starting Phase 3 (Item CRUD) Integration Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('1. Database connected.');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/items', require('../src/routes/itemRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/items`;

  const ownerEmail = `owner_${Date.now()}@example.com`;
  const otherEmail = `other_${Date.now()}@example.com`;

  let owner, otherUser, ownerToken, otherToken, testItem;

  try {
    owner = await User.create({
      name: 'Owner User',
      email: ownerEmail,
      password: 'password123',
      location: 'Campus West'
    });
    otherUser = await User.create({
      name: 'Other User',
      email: otherEmail,
      password: 'password123',
      location: 'Campus East'
    });

    ownerToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    otherToken = jwt.sign({ id: otherUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 1. Create item validation error
    const resBadCreate = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ title: 'Just a title' })
    });
    console.log('2. Create missing fields status:', resBadCreate.status);
    if (resBadCreate.status !== 400) throw new Error('Expected 400 for missing item fields');

    // 2. Create valid item
    const resCreate = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: 'Sony Alpha Camera',
        description: 'Mirrorless 4K camera with 24-70mm lens',
        category: 'Electronics',
        condition: 'Like New',
        pricePerDay: 25,
        securityDeposit: 100,
        location: 'Campus Dorm A'
      })
    });
    const dataCreate = await resCreate.json();
    console.log('3. Create valid item status:', resCreate.status, 'Title:', dataCreate.title);
    if (resCreate.status !== 201 || !dataCreate._id) throw new Error('Create item failed');
    testItem = dataCreate;

    // 3. Get all items
    const resGetAll = await fetch(baseUrl);
    const dataGetAll = await resGetAll.json();
    console.log('4. Get all items status:', resGetAll.status, 'Count:', dataGetAll.length);
    if (resGetAll.status !== 200 || !Array.isArray(dataGetAll)) throw new Error('Get items failed');

    // 4. Get single item
    const resGetOne = await fetch(`${baseUrl}/${testItem._id}`);
    const dataGetOne = await resGetOne.json();
    console.log('5. Get item by ID status:', resGetOne.status, 'Owner:', dataGetOne.ownerId?.name);
    if (resGetOne.status !== 200 || dataGetOne.title !== testItem.title) throw new Error('Get item by ID failed');

    // 5. Update item by other user (should be 403 Forbidden)
    const resUnauthorizedUpdate = await fetch(`${baseUrl}/${testItem._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`
      },
      body: JSON.stringify({ title: 'Hacked Title' })
    });
    console.log('6. Unauthorized update status:', resUnauthorizedUpdate.status);
    if (resUnauthorizedUpdate.status !== 403) throw new Error('Expected 403 for non-owner update');

    // 6. Update item by owner
    const resOwnerUpdate = await fetch(`${baseUrl}/${testItem._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ pricePerDay: 30 })
    });
    const dataOwnerUpdate = await resOwnerUpdate.json();
    console.log('7. Owner update status:', resOwnerUpdate.status, 'New price:', dataOwnerUpdate.pricePerDay);
    if (resOwnerUpdate.status !== 200 || dataOwnerUpdate.pricePerDay !== 30) throw new Error('Owner update failed');

    // 7. Prevent deleting item in active transaction
    const mockTx = await Transaction.create({
      itemId: testItem._id,
      ownerId: owner._id,
      borrowerId: otherUser._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      status: 'ACTIVE'
    });

    const resDeleteActive = await fetch(`${baseUrl}/${testItem._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('8. Delete item during active transaction status:', resDeleteActive.status);
    if (resDeleteActive.status !== 400) throw new Error('Expected 400 when deleting rented item');

    // Clean up mock transaction
    await Transaction.deleteOne({ _id: mockTx._id });

    // 8. Delete item by owner
    const resDelete = await fetch(`${baseUrl}/${testItem._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('9. Delete item status:', resDelete.status);
    if (resDelete.status !== 200) throw new Error('Expected 200 for item deletion');

    console.log('--- Phase 3 Item CRUD Integration Test Passed Successfully! ---');
  } finally {
    console.log('Cleaning up test data...');
    if (testItem) await Item.deleteOne({ _id: testItem._id });
    if (owner) await User.deleteOne({ _id: owner._id });
    if (otherUser) await User.deleteOne({ _id: otherUser._id });
    server.close();
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

testPhase3().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
