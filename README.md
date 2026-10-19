# BorrowLoop — Peer-to-Peer Borrowing Platform

**Semester 5 Innovative Full-Stack Development Project**

BorrowLoop is a full-stack, secure peer-to-peer item sharing platform designed for campus communities. It enables members to lend underutilized tools, electronics, camping gear, and textbooks, while allowing borrowers to discover and reserve items with strict double-booking prevention, state-guarded lifecycles, withdrawal/recall options, overdue penalties, and verified reputation feedback.

---

## Architecture Overview

- **Backend:** Node.js, Express.js (v5), MongoDB Atlas with Mongoose (v9), JWT Authentication, bcryptjs password hashing.
- **Frontend:** React (Vite), React Router v6, Axios with Bearer token interceptor, Tailwind CSS, Lucide React.
- **Architecture:** Monorepo with `/backend` and `/frontend`.

---

## Features & Implementation

### 1. Authentication & Authorization (`/api/auth`)
- User registration and login with bcrypt password hashing.
- JWT token generation (30-day validity) and verified `Authorization: Bearer <token>` injection.
- Session validation via `GET /api/auth/me`.
- Role escalation prevention (privileged roles cannot be self-assigned).

### 2. Item Inventory & Lifecycle (`/api/items`)
- Public listing discovery with keyword search, category filtering, and location filtering.
- Create, update, and delete listings restricted to verified owners.
- Active rental lock: prevents deletion or marking unavailable while actively borrowed in an ongoing transaction.

### 3. Borrow Requests & Date Overlap Engine (`/api/borrow-requests`)
- Request creation with start date, end date, and custom message.
- **Anti-Self-Borrowing Rule:** Prevents users from requesting their own listings.
- **Half-Open Date Interval Algorithm `[startDate, endDate)`:** Prevents double-booking while cleanly permitting non-overlapping back-to-back rentals.
- **Approval-Time Conflict Recheck:** Re-evaluates overlaps during lender approval to prevent race conditions across competing pending requests.
- **Strict State Guards:** Only `PENDING` requests can be approved, rejected, or cancelled.

### 4. Transactions, Returns & Recall Controls (`/api/transactions`)
- **Automated Contract Creation:** Approved requests instantly spawn active transactions with trusted server-calculated totals.
- **Mark Returned & Complete (`PUT /api/transactions/:id/complete`):** Handover verification flips the status to `COMPLETED`, records `returnedAt` timestamp, and releases item availability back to `AVAILABLE`.
- **Lender Withdrawal / Recall (`PUT /api/transactions/:id/cancel`):** If a lender urgently requires their item back after commitment, they can cancel the commitment. The transaction is marked `CANCELLED` with a recorded reason, and the item is immediately returned to `AVAILABLE`.
- **Overdue Detection & Non-Return Protection (`PUT /api/transactions/:id/report-overdue`):**
  - **Dynamic Overdue Tracking:** When the deadline has elapsed (`Date.now() > transaction.endDate`), the transaction displays a pulsing `⚠️ OVERDUE` badge and calculates accruing late fees (`overdueDays * pricePerDay`).
  - **Deposit Forfeiture:** If the borrower fails to return the item, the lender can report it overdue to retain the security deposit for replacement/compensation.
  - **Borrower Penalty:** Automatically deducts **20 Borrow Credits** and applies a penalty strike to the borrower's public rating.

### 5. Community Reputation & Feedback (`/api/reviews`)
- Restricted exclusively to verified participants of `COMPLETED` transactions.
- Compound unique index on `{ transactionId, reviewerId }` prevents duplicate review submissions.
- Dynamic running weighted average rating calculation displayed across profiles and listing cards.

---

## API Reference

| Domain | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Public | Register new user account |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| **Auth** | `GET` | `/api/auth/me` | Protected | Fetch current logged-in user profile |
| **Items** | `GET` | `/api/items` | Public | Browse/filter all available items |
| **Items** | `GET` | `/api/items/:id` | Public | Get item details and lender reputation |
| **Items** | `POST` | `/api/items` | Protected | List a new item for lending |
| **Items** | `PUT` | `/api/items/:id` | Protected (Owner) | Update listing or toggle availability |
| **Items** | `DELETE` | `/api/items/:id` | Protected (Owner) | Delete item (prevented if actively rented) |
| **Requests** | `POST` | `/api/borrow-requests` | Protected | Submit a date-bounded borrow request |
| **Requests** | `GET` | `/api/borrow-requests` | Protected | List user's incoming and outgoing requests |
| **Requests** | `PUT` | `/api/borrow-requests/:id/approve` | Protected (Owner) | Approve request & spawn active transaction |
| **Requests** | `PUT` | `/api/borrow-requests/:id/reject` | Protected (Owner) | Decline a pending request |
| **Requests** | `PUT` | `/api/borrow-requests/:id/cancel` | Protected (Borrower) | Cancel an unapproved pending request |
| **Transactions** | `GET` | `/api/transactions` | Protected (Participant) | View active and completed rental history |
| **Transactions** | `GET` | `/api/transactions/:id` | Protected (Participant) | View single rental transaction details |
| **Transactions** | `PUT` | `/api/transactions/:id/complete` | Protected (Participant) | Confirm item return & complete transaction |
| **Transactions** | `PUT` | `/api/transactions/:id/cancel` | Protected (Owner) | Recall item & cancel rental commitment |
| **Transactions** | `PUT` | `/api/transactions/:id/report-overdue` | Protected (Owner) | Report overdue/unreturned item & retain deposit |
| **Reviews** | `POST` | `/api/reviews` | Protected (Participant) | Rate completed transaction (1-5 stars + comment) |
| **Reviews** | `GET` | `/api/reviews/:targetId` | Public | Fetch reviews for a specific user or item |
| **Health** | `GET` | `/api/health` | Public | Health status & database connectivity check |

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

The backend includes a comprehensive 6-phase test suite:
- `npm run test:phase1`: Database connection, `/api/health`, and centralized 404 error handling.
- `npm run test:phase2`: Registration, login, validation, missing fields, duplicate emails, and `/api/auth/me`.
- `npm run test:phase3`: Item CRUD, authorization guards, and active transaction deletion prevention.
- `npm run test:phase4`: Borrow requests, competing requests, double-booking overlap checks, and status transitions.
- `npm run test:phase5`: Transaction creation, participant access control, completion flow, and item release.
- `npm run test:phase6`: Review eligibility, dynamic rating calculations, and duplicate review prevention.
- `npm run test:all`: Complete 6-phase test suite run in sequence.
