Hostel Management System

A full-stack Hostel Management System for managing hostel organizations, staff hierarchy, hostels, rooms, beds, tenants, allocations, rent, payments, maintenance, expenses, visitors, facilities, and reports.

Technology Stack

Backend

Node.js

Express.js

TypeScript

MySQL

mysql2/promise

JWT/session-based authentication

bcrypt password hashing

Frontend

Svelte 5

SvelteKit 2

TypeScript

Vite

Astryx Svelte UI

StyleX

Lucide icons

Project Structure

hostel-management/
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── tests/
│   │   └── scratch/
│   ├── package.json
│   └── tsconfig.json
│
├── easypg/                  # SvelteKit frontend
│   ├── src/
│   ├── static/
│   ├── package.json
│   └── vite.config.*
│
├── database/                # SQL/schema/reset scripts if present
└── README.md

The exact folder contents can evolve as the project grows. The backend README documents the API side in more detail.

1. System Architecture

The application follows a frontend/backend separation.

┌──────────────────────────┐
│      Svelte Frontend     │
│      SvelteKit + TS      │
└────────────┬─────────────┘
             │ HTTP/JSON
             │ Bearer token
             ▼
┌──────────────────────────┐
│     Express Backend      │
│       Node + TS          │
├──────────────────────────┤
│ Routes                   │
│ Middleware               │
│ Controllers              │
│ Scope / Authorization    │
│ Business Logic           │
│ Models / DB access       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│          MySQL           │
└──────────────────────────┘

Responsibilities

Frontend

UI and navigation

Forms

Loading/error/empty states

API communication

Displaying backend data

Role-specific navigation

Backend

Authentication

Authorization

Validation

Business rules

Hostel/tenant scope

Transactions

Database operations

API responses

Database

Persistent system data

Organization relationships

Hostel structure

Tenant history

Financial records

Maintenance history

The backend is authoritative for security and business rules. Frontend visibility is not treated as a security boundary.

2. Organization Hierarchy

The system does not use one simple linear hierarchy. Relationships are stored separately.

System Admin
    │
    └── Head
          │
          ├── Partner
          │     ├── Manager
          │     └── Hostel
          │            └── Supervisor
          │
          └── Partner
                ├── Manager
                └── Hostel

Important relationships:

Head ↔ Partner
Partner ↔ Manager
Partner ↔ Hostel
Manager ↔ Hostel
Hostel ↔ Supervisor

Supervisor responsibility is separated into:

TENANT_ADMIN

MAINTENANCE

A hostel can have one active supervisor for each responsibility.

3. Roles

The system supports role-based access including:

SUPERADMIN

ADMIN

HEAD

PARTNER

MANAGER

SUPERVISOR

The supervisor responsibility determines additional permissions:

TENANT_ADMIN
    → tenant-related operations

MAINTENANCE
    → maintenance-related operations

The exact permission scope is enforced by the backend.

4. Major Modules

Authentication

Login

Session/profile retrieval

Logout

Bearer-token authentication

Password hashing

Organization Management

Head creation

Partner creation

Manager creation

Supervisor creation

Hostel creation

Organization assignments

Hostel Structure

Hostel
  └── Floor
       └── Room
            └── Bed

Room capacity is enforced by the backend.

Tenant Management

Tenant profiles

Documents

Emergency contacts

Preferences

Stay history

Tenant creation does not automatically create an active allocation.

Allocation

Check-in

Bed allocation

Bed transfer

Check-out

Historical allocations

The system prevents active double allocation.

Rent & Payments

Rent structures

Rent records

Payments

Outstanding balances

Receipts

Receipts are generated only for successful payments.

Maintenance

Maintenance targets

Complaints

Requests

Assignments

Updates/history

Corrective/preventive maintenance

Expenses

Expense categories

Hostel expenses

Expense summaries

Visitors

Visitor records

Visits

Tenant visit association

Check-in/check-out

Facilities

Facility definitions

Hostel facility assignments

Active/inactive assignment management

Reports

Dashboard metrics

Occupancy

Revenue

Maintenance

Scoped reporting

5. Database

The system uses MySQL.

Major tables include:

staff
person
superadmin
role
role_assignment

head
partner
manager
supervisor

head_partner_assignment
partner_manager_assignment
partner_hostel_assignment
manager_hostel_assignment
hostel_supervisor_assignment

hostel
hostel_staff

floor
room
bed

facility
hostel_facility

tenant
tenant_document
emergency_contact
tenant_preference
tenant_stay
tenant_allocation

rent_structure
rent
payment
receipt

expense_category
expense

maintenance_target
maintenance_complaint
maintenance_request
maintenance_update

visitor
visit
visit_tenant

The current implementation was designed without requiring schema changes during Phases 1–15.

6. Important Business Rules

Hostel distribution

When creating a hostel, a Partner can be selected explicitly.

If no Partner is supplied, the backend can assign the least-loaded active Partner, using lower Partner ID as the tie-breaker.

Manager assignment

A Manager can manage multiple hostels.

Each hostel can have at most one active Manager.

A Manager can only be assigned to a hostel belonging to the Manager's Partner.

Supervisor assignment

Each hostel supports at most:

1 active TENANT_ADMIN
1 active MAINTENANCE

Allocation

A bed cannot have multiple active allocations.

Transfers preserve the old allocation as history and create the new active allocation.

Payments

Only successful payments can generate receipts.

Scope

Users only receive data belonging to their permitted hostel scope.

Backend scope enforcement is authoritative.

7. Authentication

The frontend uses the backend authentication/session system.

The frontend sends an authenticated request using a Bearer token where required.

The backend resolves the authenticated staff member and builds the user's allowed scope.

Typical protected flow:

Login
  ↓
Token/session
  ↓
Authenticated request
  ↓
User identity
  ↓
Role
  ↓
Allowed hostels
  ↓
Controller/business operation

8. Environment Configuration

Backend

Use the backend environment configuration appropriate for the local database and server.

Typical values include:

PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=hostel_management
JWT_SECRET=...

Do not commit real credentials or secrets to source control.

Frontend

The current live-mode configuration uses:

VITE_API_MODE=live
VITE_API_BASE_URL=http://localhost:5000/api

Use environment-specific values for production.

9. Running the Project

Backend

From the backend directory:

npm install
npm run dev

For type checking:

npx tsc --noEmit

Frontend

From the frontend directory:

pnpm install
pnpm dev

Type/Svelte checking:

pnpm check

Production build:

pnpm build

10. Testing

The project contains integration testing for the implemented modules.

The final end-to-end verification covered:

Authentication

Organization hierarchy


Role authorization

Scope isolation


The test suite also verified that cross-partner/hostel access is rejected by backend scope enforcement.

11. Development Principles

Backend owns business logic

Do not rely on frontend checks for security.

For example, even if the frontend hides Hostel B from Manager A, the backend must still reject:

Manager A → Hostel B

Use transactions for multi-step operations

Operations such as allocation/transfer and maintenance conversion may involve multiple database updates and should remain atomic.

Preserve history

Do not overwrite important historical records when the business operation requires history.

For example:

Old Allocation → COMPLETED
New Allocation → ACTIVE

No hardcoded live business data

Live mode should retrieve actual organization and operational data from the backend/database.


13. Production Considerations

Before an actual production deployment, review:

HTTPS

Production database credentials

JWT/session secret management

CORS configuration

Rate limiting

Database backups

Logging and monitoring

Error tracking

Migration/deployment process

Secure cookie/token configuration

Environment-specific configuration

Removal or isolation of development-only test artifacts

14. License

Add the project's intended license here before public distribution.