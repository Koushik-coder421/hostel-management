# Hostel Management System — Backend API

A robust RESTful API built with **Node.js**, **Express.js**, **TypeScript**, and **MySQL** for comprehensive hostel organization, resident stay allocation, financial operations, and maintenance workflows.

---

## Tech Stack

- **Runtime**: Node.js & TypeScript (`tsc`, `tsx`)
- **Web Framework**: Express.js
- **Database**: MySQL 8.0 (`mysql2/promise`)
- **Authentication**: JSON Web Tokens (JWT) & `bcryptjs` password hashing

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database connection pool & environment setup
│   ├── controllers/     # API request handlers (auth, hierarchy, tenant, etc.)
│   ├── middleware/      # Auth JWT verification & global error handling
│   ├── routes/          # Express route definitions
│   ├── utils/           # User scope resolution & helper utilities
│   ├── database/        # MySQL schema, reset, and seeding scripts
│   └── index.ts         # Express server entry point
├── package.json
└── tsconfig.json
```

---

## Key Modules & System Architecture

1. **Authentication & Authorization**:
   - JWT-based authentication with role-based access control (RBAC).
   - Roles supported: `SUPERADMIN`, `ADMIN`, `HEAD`, `PARTNER`, `MANAGER`, `SUPERVISOR`, `TENANT`.
   - Responsibility division for Supervisors: `TENANT_ADMIN` vs `MAINTENANCE`.

2. **Organization Hierarchy & Hostels**:
   - Multi-tier structure: System Head ➔ Business Partner ➔ Property Manager ➔ Property Supervisor.
   - Physical layout hierarchy: Hostel ➔ Floor ➔ Room ➔ Bed (enforces room capacity limits).

3. **Tenant & Allocation Lifecycle**:
   - Resident onboarding and profile management.
   - Separate Check-In flow linking residents to active beds (`tenant_allocation`).
   - Bed transfers (preserving historical records) and Check-Out with dues validation.

4. **Financials & Accounting**:
   - Rent structures and invoicing.
   - Payment recording (cash, UPI, bank transfer, card) with automated receipt generation for successful payments.
   - Operational expense tracking categorized under 8 default categories (Plumbing, Electrical, HVAC, Furniture, Cleaning, Utilities, General, Networking).

5. **Maintenance & Visitor Operations**:
   - Resident complaint logging, priority assignment, and work order tracking.
   - Visitor registration and arrival/checkout logs.
   - Facility allocation and status management.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL Database Server (v8.0 or higher)

### Installation & Environment

1. Navigate to the backend directory and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the `backend/` root:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=hostel_management
   JWT_SECRET=your_jwt_secret_key
   ```

3. Run schema migration & seed initial data:
   ```bash
   npm run seed
   ```

### Running the Server

- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Type Checking**:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

---

## API Endpoints Overview

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/session` | Login & receive JWT token |
| **Auth** | `GET` | `/api/session` | Fetch authenticated user profile & scope |
| **Hierarchy** | `GET` | `/api/hierarchy/dashboard` | Role-filtered organization metrics |
| **Hierarchy** | `POST` | `/api/hierarchy/manager` | Create a new Manager under a Partner |
| **Hierarchy** | `POST` | `/api/hierarchy/supervisor` | Create a Supervisor with specific responsibility |
| **Hostels** | `GET` | `/api/hostels` | List assigned properties |
| **Tenants** | `GET` | `/api/tenants` | List registered tenants |
| **Allocations**| `POST` | `/api/allocations/check-in` | Allocate resident to available bed |
| **Allocations**| `POST` | `/api/allocations/check-out` | Checkout resident & validate outstanding dues |
| **Payments** | `POST` | `/api/payments` | Record resident payment |
| **Expenses** | `GET` | `/api/expenses` | List operational outflows & category summaries |
| **Expenses** | `POST` | `/api/expenses` | Record a hostel operational expense |
| **Maintenance**| `GET` | `/api/maintenance/complaints` | Fetch open maintenance tickets |
| **Visitors** | `POST` | `/api/visitors/visits` | Register new resident visitor |

---

## Verification & Testing

- **TypeScript Compilation**: `npx tsc --noEmit` (0 errors)
- **API Tests**: `npx tsx src/scratch/test_e2e_all_phases.ts`