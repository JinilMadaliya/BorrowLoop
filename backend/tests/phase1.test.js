// Phase 1 verification test
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

async function testPhase1() {
  console.log('--- Starting Phase 1 Integration Test ---');

  // Test 1: Connect to DB
  console.log('1. Testing MongoDB connection...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('   MongoDB connection state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');

  // Test 2: Start server on random port
  console.log('2. Starting server and testing endpoints...');
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/auth', require('../src/routes/authRoutes'));
  app.use('/api/items', require('../src/routes/itemRoutes'));
  app.use('/api/borrow-requests', require('../src/routes/borrowRoutes'));
  app.use('/api/reviews', require('../src/routes/reviewRoutes'));

  app.get('/api/health', (req, res) => {
    const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const dbState = mongoose.connection.readyState;
    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatusMap[dbState] || 'unknown'
    });
  });

  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BorrowLoop API!' });
  });

  app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`   Test server running on port ${port}`);

  // Test root
  const resRoot = await fetch(`http://localhost:${port}/`);
  const dataRoot = await resRoot.json();
  console.log('3. GET / status:', resRoot.status, 'Response:', JSON.stringify(dataRoot));
  if (resRoot.status !== 200 || !dataRoot.message) throw new Error('Root route failed');

  // Test health
  const resHealth = await fetch(`http://localhost:${port}/api/health`);
  const dataHealth = await resHealth.json();
  console.log('4. GET /api/health status:', resHealth.status, 'Response:', JSON.stringify(dataHealth));
  if (resHealth.status !== 200 || dataHealth.status !== 'ok' || dataHealth.database !== 'connected') {
    throw new Error('Health route failed');
  }

  // Test 404
  const res404 = await fetch(`http://localhost:${port}/api/undefined-endpoint`);
  const data404 = await res404.json();
  console.log('5. GET /api/undefined-endpoint status:', res404.status, 'Response:', JSON.stringify(data404));
  if (res404.status !== 404 || !data404.message.includes('Route not found')) {
    throw new Error('404 handling failed');
  }

  server.close();
  await mongoose.disconnect();
  console.log('--- Phase 1 Verification Passed Successfully! ---');
}

testPhase1().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 1 test failed:', err);
  process.exit(1);
});
