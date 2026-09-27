Hostel Management System — Backend

Backend API for the Hostel Management System.

Built with:

Node.js

Express.js

TypeScript

MySQL

mysql2/promise

JWT/session authentication

bcrypt

The backend is responsible for authentication, authorization, validation, business rules, hostel scope enforcement, transactions, and database operations.

1. Architecture

HTTP Request
    │
    ▼
Routes
    │
    ▼
Middleware
    │
    ├── Authentication
    ├── Authorization
    └── Validation
    │
    ▼
Controllers
    │
    ▼
Business / Scope Logic
    │
    ▼
Models / Database Access
    │
    ▼
MySQL

Routes

Routes define the API endpoints and connect requests to controllers.

Middleware

Middleware handles cross-cutting concerns such as:

Authentication

Authorization

Request processing

Scope enforcement where applicable

Controllers

Controllers handle:

Request parameters/body

Validation

Business operations

Database calls

HTTP responses

Models / database layer

The database layer handles persistence and SQL operations.

2. Project Structure

A typical backend structure is:

backend/
├── src/
│   ├── config/
│   │   └── database.*
│   │
│   ├── controllers/
│   │   ├── auth.controller.*
│   │   ├── hierarchy.controller.*
│   │   ├── hostel.controller.*
│   │   ├── tenant.controller.*
│   │   ├── allocation.controller.*
│   │   ├── maintenance.controller.*
│   │   ├── expense.controller.*
│   │   ├── visitor.controller.*
│   │   ├── facility.controller.*
│   │   └── ...
│   │
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── scratch/
│
├── package.json
└── tsconfig.json

The exact list can evolve with the implementation.

3. Installation

From the backend directory:

npm install

4. Environment Variables

Configure the backend environment for your local MySQL instance.

Example:

PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hostel_management

JWT_SECRET=your_secure_secret

Use your project's actual variable names if they differ.

Never commit production passwords, database credentials, or authentication secrets.

5. Running the Backend

Development:

npm run dev

Type checking:

npx tsc --noEmit

If a production build script is configured:

npm run build

Start the compiled application using the project's configured production command.

6. Database

The backend uses MySQL.

Main database:

hostel_management

The database contains organizational, hostel, tenant, financial, maintenance, visitor, and reporting data.

Core organization tables:

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

Hostel structure:

hostel
floor
room
bed

Tenant:

tenant
tenant_document
emergency_contact
tenant_preference
tenant_stay
tenant_allocation

Financial:

rent_structure
rent
payment
receipt
expense_category
expense

Maintenance:

maintenance_target
maintenance_complaint
maintenance_request
maintenance_update

Other:

facility
hostel_facility
visitor
visit
visit_tenant

7. Authentication

Authentication establishes the current staff identity.

Protected API requests require valid authentication.

Typical flow:

POST login
     ↓
Authentication
     ↓
JWT/session
     ↓
Authorization header
     ↓
Protected API

Example header:

Authorization: Bearer <token>

The backend resolves:

Staff
 ↓
Role
 ↓
Organization relationships
 ↓
Allowed Hostel IDs
 ↓
Controller authorization

8. Authorization & Scope

Authorization is enforced on the backend.

The central scope logic determines which hostels a user can access.

The application uses scope information such as:

allowedHostelIds
activeHostelId
role
responsibility

Controllers use this information to prevent cross-hostel and cross-partner access.

A frontend restriction is never considered sufficient security.

9. Roles

Supported roles include:

SUPERADMIN
ADMIN
HEAD
PARTNER
MANAGER
SUPERVISOR

Supervisor responsibility:

TENANT_ADMIN
MAINTENANCE

Responsibilities are intentionally separated.

For example:

TENANT_ADMIN
    → tenant administration

MAINTENANCE
    → maintenance operations

A supervisor cannot gain access to another responsibility simply by modifying a frontend request.

10. Organization APIs

Representative endpoints include:

GET  /api/hierarchy/dashboard
GET  /api/hierarchy/heads
GET  /api/hierarchy/partners
GET  /api/hierarchy/managers
GET  /api/hierarchy/supervisors
GET  /api/hierarchy/assignments

Creation:

POST /api/hierarchy/head
POST /api/hierarchy/partner
POST /api/hierarchy/manager
POST /api/hierarchy/supervisor

Assignments:

POST /api/hierarchy/assign/head-partner
POST /api/hierarchy/assign/partner-manager
POST /api/hierarchy/assign/partner-hostel
POST /api/hierarchy/assign/manager-hostel
POST /api/hierarchy/assign/supervisor-hostel

Hostels:

GET  /api/hostels
POST /api/hostels

Additional hostel operations depend on the current route/controller implementation.

11. Organization Rules

Hostel Partner

A hostel may explicitly select its Partner.

If Partner is omitted, backend distribution logic can assign an active Partner based on current load.

Manager

A Manager may manage multiple hostels.

A hostel can have only one active Manager.

The Manager's Partner must match the Hostel's Partner.

Invalid example:

Manager B
    ↓
Partner B

Hostel A
    ↓
Partner A

The assignment must be rejected.

Supervisor

A hostel can have:

1 × TENANT_ADMIN
1 × MAINTENANCE

Both responsibilities may coexist.

12. Hostel Structure APIs

The backend manages:

Hostel
  ↓
Floor
  ↓
Room
  ↓
Bed

Business rules include room capacity enforcement and bed availability.

A room with:

capacity = 2

cannot receive a third active bed.

13. Tenant APIs

Tenant management covers:

Tenant
Tenant Documents
Emergency Contacts
Tenant Preferences
Tenant Stay

Important rule:

Creating a tenant does not automatically create an active allocation.

Check-in is a separate business operation.

14. Allocation APIs

Allocation handles:

Check-in

Active bed allocation

Transfer

Check-out

Allocation history

The backend prevents:

Bed 1
 ├── Tenant A ACTIVE
 └── Tenant B ACTIVE

A bed can have only one active allocation.

Transfer

A transfer preserves history:

Old Allocation
    ↓
COMPLETED

Old Bed
    ↓
AVAILABLE

New Allocation
    ↓
ACTIVE

New Bed
    ↓
OCCUPIED

These multi-step operations use transactions where required.

15. Rent & Payment

The financial module manages:

rent_structure
rent
payment
receipt

Important rule:

Receipts are only generated for successful payments.

The backend rejects receipt generation for:

FAILED
PENDING

payments.

16. Maintenance

Maintenance workflow:

Complaint
    ↓
Maintenance Request
    ↓
Assignment
    ↓
Updates
    ↓
Completion

The system also tracks maintenance targets and status changes.

Supervisor responsibilities are enforced:

TENANT_ADMIN
    ✗ maintenance write operations

MAINTENANCE
    ✓ maintenance operations

17. Expenses

Representative endpoints:

GET    /api/expenses/categories
POST   /api/expenses/categories

GET    /api/expenses
GET    /api/expenses/:id
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/expenses/summary

Expenses are associated with a hostel and recorded by authenticated staff.

Scope restrictions apply to expense retrieval and summaries.

18. Visitors

Representative endpoints:

GET   /api/visitors/visitors
POST  /api/visitors/visitors

GET   /api/visitors/visits
POST  /api/visitors/visits

PATCH /api/visitors/visits/:id/checkout

A visit linked to a tenant must respect the tenant's active hostel allocation.

Cross-hostel tenant/visit associations are rejected.

19. Facilities

Representative endpoints:

GET   /api/facilities/hostel/:hostel_id
POST  /api/facilities/assign
PATCH /api/facilities/assignment/:id

The backend prevents duplicate active hostel-facility assignments and supports safe deactivation/reactivation behavior.

20. Reports

Reporting endpoints include:

GET /api/reports/dashboard
GET /api/reports/occupancy
GET /api/reports/revenue
GET /api/reports/maintenance
GET /api/views/*splat

Report data is filtered using the authenticated user's allowed hostel scope.

Example:

Partner A
 ├── Hostel A1
 └── Hostel A2

Partner B
 ├── Hostel B1
 └── Hostel B2

Partner A's reports must not include B1/B2 data.

21. Scope Security

The backend must reject attempts such as:

Partner A → Hostel B
Manager A → Tenant belonging to Hostel B
Manager A → Expense belonging to Hostel B
Manager A → Visitor belonging to Hostel B

Expected authorization response is normally:

403 Forbidden

depending on the endpoint and validation layer.

22. API Testing

The project includes integration/E2E testing.

The final recorded end-to-end test result was:

20 tests
20 passed
0 failed

Coverage included:

Authentication

Organization hierarchy

Assignment rules

Hostel structure

Tenant management

Allocation

Transfer

Checkout

Rent

Payments

Receipts

Maintenance

Expenses

Visitors

Facilities

Reports

Authorization

Scope isolation

23. Backend Verification Commands

Run:

npx tsc --noEmit

Expected:

0 TypeScript errors

Run the project's integration test command when available.

Example used during final verification:

npx ts-node src/scratch/test_e2e_all_phases.ts

Do not treat a scratch test as a production API endpoint.

24. Error Handling

API errors should be handled consistently by returning an appropriate HTTP status and useful message.

Common categories:

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error

Frontend code should display meaningful API errors rather than exposing internal database details.

25. Development Guidelines

When adding a new module:

Define the business rule.

Add/update the route.

Add authentication/authorization.

Add scope enforcement.

Implement controller/business logic.

Use transactions for multi-query state changes.

Validate input.

Test success cases.

Test negative cases.

Test cross-hostel access.

Run TypeScript checks.

Run integration tests.

Do not rely on frontend checks for authorization.

26. Security Checklist

Before production deployment:

Use a strong production JWT/session secret.

Never commit .env credentials.

Configure production CORS explicitly.

Enable HTTPS.

Review token/session expiration.

Review cookie/token storage.

Add appropriate rate limiting.

Validate all externally supplied IDs and fields.

Keep SQL parameterized.

Review database user permissions.

Configure database backups.

Configure logging/monitoring.

Remove unnecessary development endpoints/files.

27. Current Verification Status

Final integration verification recorded:

Backend TypeScript:     PASS
Frontend integration:   PASS
E2E tests:              20/20 PASS
Authorization:          PASS
Scope isolation:        PASS
Database schema change: NONE

Manual frontend testing should still verify that the actual UI exposes and displays the backend behavior correctly.

28. License

Add the intended project license before public distribution.