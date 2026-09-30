# Hostel Management System

A full-stack enterprise web application for modern hostel operations, organization hierarchy management, tenant allocation, financial accounting, maintenance ticket tracking, and visitor logging.

---

## Tech Stack

### Frontend (`easypg/`)
- **Framework**: SvelteKit 2 + Svelte 5 (Runes architecture)
- **Language**: TypeScript
- **UI Components**: Astryx Svelte Core (`@astryx-svelte/core`)
- **Styling**: StyleX & CSS Modules
- **Icons**: Lucide Icons (`@lucide/svelte`)
- **Build Tool**: Vite

### Backend (`backend/`)
- **Runtime**: Node.js & Express.js
- **Language**: TypeScript (`tsc`, `tsx`)
- **Database**: MySQL 8.0 (`mysql2/promise`)
- **Security**: JWT authentication, `bcryptjs` hashing, role-based scope resolution

---

## Repository Structure

```
hostel-management/
├── backend/                   # RESTful API (Express + TypeScript + MySQL)
│   ├── src/
│   │   ├── config/            # DB configuration & environment variables
│   │   ├── controllers/       # Business logic handlers
│   │   ├── middleware/        # JWT auth & error handling
│   │   ├── routes/            # API endpoints
│   │   ├── utils/             # Scope & helper utilities
│   │   └── database/          # SQL schema & seed scripts
│   ├── package.json
│   └── tsconfig.json
│
├── easypg/                    # Modern SvelteKit Frontend
│   ├── src/
│   │   ├── lib/               # Shared components, API client, services & stores
│   │   └── routes/            # SvelteKit app routes & presentation pages
│   ├── package.json
│   └── vite.config.ts
│
└── .github/
    └── workflows/             # CI Action workflows
```

---

## Architecture & System Capabilities

1. **Multi-Tenant Organization Hierarchy**:
   - Hierarchy levels: System Admin ➔ Organization Head ➔ Business Partner ➔ Property Manager ➔ Property Supervisor.
   - Dual Supervisor Responsibilities: `TENANT_ADMIN` (Resident management) vs `MAINTENANCE` (Repair operations).

2. **Property Layout & Physical Inventory**:
   - Structured mapping: Hostel ➔ Floor ➔ Room ➔ Bed.
   - Dynamic room capacity checking and bed operational status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`).

3. **Tenant Lifecycle & Stay Allocations**:
   - Resident profile creation and document storage.
   - Separate Check-In flow allocating residents to specific beds (`tenant_allocation`).
   - Bed transfer with historical tracking and Check-Out dues enforcement.

4. **Financial Operations & Invoicing**:
   - Rent structures, payment recording (Cash, UPI, Card, Bank Transfer).
   - Automated receipt issuance for confirmed payments.
   - Operational expense tracking across 8 default categories (Plumbing, Electrical, HVAC, Furniture, Cleaning, Utilities, General, Networking).

5. **Maintenance & Visitor Operations**:
   - Resident complaint filing, ticket priority assignment, and work order updates.
   - Visitor log registration and check-in/check-out tracking.
   - Hostel facility allocation and active status management.

---

## Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **MySQL**: v8.0 or higher

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment in .env
# DB_HOST=localhost, DB_PORT=3306, DB_USER=root, DB_PASSWORD=your_password, DB_NAME=hostel_management, JWT_SECRET=your_jwt_secret

# Initialize database schema & seed default data
npm run seed

# Start API dev server (default http://localhost:5000)
npm run dev
```

### 2. Frontend Setup

```bash
cd easypg

# Install dependencies
pnpm install

# Start SvelteKit dev server (default http://localhost:5180)
pnpm dev
```

---

## Quality Assurance & Verification

- **Backend Type Check**:
  ```bash
  cd backend && npx tsc --noEmit
  ```
- **Frontend Diagnostics**:
  ```bash
  cd easypg && npx svelte-check
  ```
- **Production Builds**:
  ```bash
  cd backend && npm run build
  cd easypg && pnpm build
  ```

---

## License

This project is maintained for internal organization management.