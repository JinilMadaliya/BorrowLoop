// Phase 2 verification test (Authentication & Authorization)
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const User = require('../src/models/User');

async function testPhase2() {
  console.log('--- Starting Phase 2 (Auth) Integration Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('1. Database connected.');

  const app = express();
  app.use(express.json());
  app.use(cors());
  app.use('/api/auth', require('../src/routes/authRoutes'));

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/auth`;

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  try {
    // 1. Missing fields
    const resMissing = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const dataMissing = await resMissing.json();
    console.log('2. Register missing fields status:', resMissing.status, dataMissing.message);
    if (resMissing.status !== 400) throw new Error('Expected 400 for missing fields');

    // 2. Short password
    const resShortPass = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: testEmail, password: '123' })
    });
    console.log('3. Register short password status:', resShortPass.status);
    if (resShortPass.status !== 400) throw new Error('Expected 400 for short password');

    // 3. Valid registration
    const resReg = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Borrower',
        email: testEmail,
        password: testPassword,
        location: 'Campus Dorm A'
      })
    });
    const dataReg = await resReg.json();
    console.log('4. Register valid user status:', resReg.status, 'Has token:', Boolean(dataReg.token));
    if (resReg.status !== 201 || !dataReg.token || dataReg.password) {
      throw new Error('Valid registration failed or password leaked');
    }
    const token = dataReg.token;

    // 4. Duplicate email
    const resDup = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testEmail,
        password: testPassword
      })
    });
    console.log('5. Register duplicate email status:', resDup.status);
    if (resDup.status !== 400) throw new Error('Expected 400 for duplicate email');

    // 5. Invalid login
    const resBadLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' })
    });
    console.log('6. Login bad credentials status:', resBadLogin.status);
    if (resBadLogin.status !== 400) throw new Error('Expected 400 for bad password');

    // 6. Valid login
    const resLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const dataLogin = await resLogin.json();
    console.log('7. Valid login status:', resLogin.status, 'Has token:', Boolean(dataLogin.token));
    if (resLogin.status !== 200 || !dataLogin.token || dataLogin.password) {
      throw new Error('Valid login failed or password leaked');
    }

    // 7. GET /api/auth/me without token
    const resMeNoToken = await fetch(`${baseUrl}/me`);
    console.log('8. GET /me no token status:', resMeNoToken.status);
    if (resMeNoToken.status !== 401) throw new Error('Expected 401 when token missing');

    // 8. GET /api/auth/me with invalid token
    const resMeBadToken = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer bad.token.value' }
    });
    console.log('9. GET /me bad token status:', resMeBadToken.status);
    if (resMeBadToken.status !== 401) throw new Error('Expected 401 for bad token');

    // 9. GET /api/auth/me with valid token
    const resMe = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataMe = await resMe.json();
    console.log('10. GET /me valid token status:', resMe.status, 'Email:', dataMe.email, 'Has password field:', Boolean(dataMe.password));
    if (resMe.status !== 200 || dataMe.email !== testEmail.toLowerCase() || dataMe.password) {
      throw new Error('Valid getMe failed or password returned');
    }

    console.log('--- Phase 2 Auth Integration Test Passed Successfully! ---');
  } finally {
    // Clean up test user
    console.log('Cleaning up test user...');
    await User.deleteOne({ email: testEmail.toLowerCase() });
    server.close();
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

testPhase2().then(() => process.exit(0)).catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
