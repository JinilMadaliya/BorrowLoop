# BorrowLoop — Peer-to-Peer Borrowing Platform

**Semester 5 Innovative Full-Stack Development Project**

BorrowLoop is a full-stack, secure peer-to-peer item sharing platform designed for campus communities. It enables members to lend underutilized tools, electronics, camping gear, and textbooks, while allowing borrowers to discover and reserve items with strict double-booking prevention, state-guarded lifecycles, and verified reputation feedback.

---

## Architecture Overview

- **Backend:** Node.js, Express.js (v5), MongoDB Atlas with Mongoose (v9), JWT Authentication, bcryptjs password hashing.
- **Frontend:** React (Vite), React Router v6, Axios with Bearer token interceptor, Tailwind CSS, Lucide React.
- **Architecture:** Monorepo with `/backend` and `/frontend`.

---

## Features & Implementation

1. **Authentication & Authorization (`/api/auth`)**
   - User registration and login with bcrypt password hashing.
   - JWT token generation (7-day validity) and verified `Authorization: Bearer <token>` injection.
   - Session validation via `GET /api/auth/me`.
   - Role escalation prevention (privileged roles cannot be self-assigned).

2. **Item Inventory & Lifecycle (`/api/items`)**
   - Public listing discovery with keyword search, category filtering, and location filtering.
   - Create, update, and delete listings restricted to the verified owner.
   - Active rental lock: prevents deletion or marking unavailable while actively borrowed.

3. **Borrow Requests & Date Overlap Engine (`/api/borrow-requests`)**
   - Request creation with start date, end date, and message.
   - Business Rule: Prevents users from borrowing their own listings.
   - Half-Open Date Interval Algorithm `[startDate, endDate)`: prevents double-booking while cleanly permitting back-to-back rentals.
   - Approval-time conflict recheck: prevents race conditions between competing pending requests.
   - Strict state transitions: only `PENDING` requests can be approved, rejected, or cancelled.

4. **Rental Transactions & Handover (`/api/transactions`)**
   - Automatically generated upon request approval with server-calculated totals.
   - Participant-only access: only the lender or borrower can view transaction details or trigger returns.
   - Return completion flips transaction to `COMPLETED` and safely releases the item status back to `AVAILABLE`.

5. **Community Reputation & Feedback (`/api/reviews`)**
   - Restricted exclusively to participants of `COMPLETED` transactions.
   - Compound unique index on `{ transactionId, reviewerId }` prevents duplicate reviews.
   - Dynamic running weighted average rating calculation displayed across profiles and listings.

---

## Environment Setup

### 1. Backend (`backend/.env`)
Create `backend/.env` based on `backend/.env.example`:
```dotenv
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/BorrowLoop?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_jwt_secret_here
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```
*(Note: Never commit `.env` or paste real MongoDB Atlas credentials into Git).*

### 2. Frontend (`frontend/.env`)
Create `frontend/.env` based on `frontend/.env.example`:
```dotenv
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Application

### Start Backend:
```bash
cd backend
npm install
npm run dev
# Server runs at http://localhost:5000
```

### Run Backend Automated Verification Tests:
```bash
cd backend
npm run test:all
```

### Start Frontend:
```bash
cd frontend
npm install
npm run dev
# Web application accessible at http://localhost:5173
```

### Build Frontend for Production:
```bash
cd frontend
npm run build
```

---

## Automated Verification Suite

The backend includes individual and end-to-end integration tests:
- `npm run test:phase1`: Database connection, `/api/health`, and centralized 404 error handling.
- `npm run test:phase2`: Registration, login, validation, missing fields, duplicate emails, and `/api/auth/me`.
- `npm run test:phase3`: Item CRUD, authorization guards, and active transaction deletion prevention.
- `npm run test:phase4`: Borrow requests, competing requests, double-booking overlap checks, and status transitions.
- `npm run test:phase5`: Transaction creation, participant access control, completion flow, and item release.
- `npm run test:phase6`: Review eligibility, dynamic rating calculations, and duplicate review prevention.
- `npm run test:all`: Complete 6-phase test suite run in sequence.
