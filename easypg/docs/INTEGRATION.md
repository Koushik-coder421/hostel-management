# Integration with an independent backend

The frontend is a static SvelteKit SPA. Express/MySQL is an intended external implementation, not included software. This handoff defines browser-facing behavior without prescribing tables, ORM, constraints, transaction design, or an authentication library.

## Source of truth

- `docs/openapi.json`: generated OpenAPI 3.1 requests, responses, and view schemas.
- `src/lib/api/wire.schema.json`: runtime-validated JSON response schema.
- `src/lib/api/contracts.ts`: presentation data structures and scalar conventions.
- `src/lib/api/operations.ts`: named business requests and HTTP paths.
- `src/lib/api/http.ts`: request headers, cookies, response envelope, and failure handling.
- `src/lib/api/transport.ts`: conversion between JSON values and presentation values.
- API client/demo modules in `src/lib/api/`: the replaceable data boundary.

TypeScript presentation objects may contain `Date` and safe integer money values. They are not literal JSON schemas. Wire values use the rules below; do not serialize database rows directly or infer a database schema from these DTOs.

## Public configuration and hosting

Set `VITE_API_MODE=live` and `VITE_API_BASE_URL=/api/v1` before building. These variables are bundled into public browser assets. The default `demo` mode uses synthetic data and does not require the original application.

Prefer one origin: serve the static build and route `/api/v1` to Express. Apply the SPA fallback only after API routing and static asset handling. An unknown API path must return a JSON error, not `index.html`. A backend returning HTML or redirecting a request is treated as an integration error by the client.

For separate origins, configure the backend’s explicit allowed frontend origin, credentialed CORS, cookie attributes, and CSRF policy together. Browser requests use `credentials: include`. Do not enable a wildcard origin as a substitute for a credentialed origin policy. Production cookies and transport protection are backend/deployment responsibilities.

## Session and authority

`GET /api/v1/session` establishes the current session and obtains the CSRF token used by later mutations. Session responses must reflect current backend identity, memberships, and allowed scope. The UI’s role and hostel selection help present controls; they grant no authority.

The operation catalog includes sign-in, sign-out, and active-hostel selection. The backend owns password verification, cookie issuance/revocation, expiration, login origin protection, and current scope validation. Mutations after login use `X-CSRF-Token`. Login requires its own backend origin/CSRF strategy because it starts without an authenticated session token.

Do not accept a role, organization, hostel, resident ID, or hidden form field as proof of access. Re-evaluate authorization and current resource state for each request. Demo role controls must never be used as live credentials.

## Read interface

View reads use `GET /api/v1/views/<route>`; resident detail uses `GET /api/v1/views/residents/:id`. Supported presentation routes are enumerated in `PageDataMap` in the contract file. Query parameters carry the filters supported by the API client. Treat view payloads as purpose-built screen data, not tables.

The initial pilot returns complete screen collections. Pagination is not yet an agreed capability: do not silently truncate lists. Before introducing pagination, extend the contract, screen behavior, and tests together with explicit cursor/page, limit, and total semantics. Backend-computed summaries must describe the intended entire population rather than accidentally summarize one visible page.

## Business requests

The operation catalog is authoritative for methods and paths. Current names include organization creation/status, staff access, admission, departure, resident profile update, payment recording, bed status, and session operations.

An admission or payment is one business request. Its backend must perform required validation, current authorization, inventory/financial changes, history, and atomic completion according to its own design. The frontend must not issue a sequence of table-like writes and then claim the operation is atomic.

All command requests carry `Idempotency-Key`. The backend must specify key scope and retention, return a consistent result for retries of the same logical operation, and reject reuse with a different payload. A transport timeout does not prove the backend rolled back. Reconciliation or retry must preserve the original logical key where supported; never assume a fresh click is safe merely because no success message arrived.

Success responses use a JSON `data` envelope. Commands return a success result defined in `operations.ts`. Do not return database records or internal errors merely to satisfy the screen.

## Wire values

| Value | Convention |
| --- | --- |
| IDs | Opaque strings. Do not assume numeric IDs or require a specific database key format. |
| Money | Integer decimal string in paise, such as `"125050"` for ₹1,250.50. No JSON floating-point rupee amounts. |
| Date-only fields | `YYYY-MM-DD`, preserving operational calendar meaning. |
| Instants | ISO 8601 timestamps with an explicit offset or UTC `Z`. |
| Operational timezone | Asia/Kolkata for displayed hostel operations; agree timezone semantics before expanding to other regions. |
| Missing optional values | Explicit `null` where the DTO permits it. |

The frontend decodes paise strings into safe integer presentation values and rejects values outside that range. This is a display constraint, not a backend storage recommendation. Keep calculations and definitive balances on the backend; do not derive authoritative financial results from browser state.

## Errors and states

Return non-success HTTP status with JSON shaped as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Correct the highlighted fields.",
    "fields": { "phone": "Enter a valid phone number." },
    "requestId": "opaque-correlation-id"
  }
}
```

`fields` and `requestId` are optional. Messages must be suitable for the user and must not expose SQL, secrets, or stack traces. Agree stable codes for invalid input, unauthenticated requests, forbidden scope, missing records, conflicts/stale state, rate limits, and unavailable operations. Use appropriate HTTP status, such as 401, 403, 404, 409, 422, or 429.

The HTTP client has a 15-second request timeout. Live network failures and malformed responses remain visible failures; demo fallback is prohibited. Handle uncertain mutation outcomes carefully. Backend request IDs should support investigation without displaying sensitive internal details. Field-error maps are preserved at the client boundary; the current screens show a visible form/global error rather than mapping every backend field error inline.

## Adapting an existing Express API

A small adapter can translate paths, rename fields, and convert wire formats into these contracts. It may not invent balances, approve exceptions, simulate live success, bypass missing authorization, or conceal unsupported business operations. If a capability is absent, agree the feature gap and display it honestly.

## Integration checklist

- [ ] Run demo without any database or the original EasyPG application.
- [ ] Agree the contract and unsupported workflows with the backend developer.
- [ ] Implement session/login/logout and current scope independently.
- [ ] Verify cookie, origin, CSRF, and credentialed request behavior in the actual deployment.
- [ ] Implement one read screen and validate exact money/date/ID serialization.
- [ ] Implement one complete business operation, including validation and conflict responses.
- [ ] Verify duplicate submission, timeout reconciliation, and idempotency behavior.
- [ ] Add remaining view and command endpoints without coupling browser code to tables.
- [ ] Exercise unauthorized API requests directly, bypassing UI controls.
- [ ] Run live API and database tests separately from frontend demo tests.
- [ ] Verify 390×844 layouts, keyboard use, and visible failure states against live responses.
- [ ] Confirm API outages never display synthetic success or demo data.

No live Express/MySQL implementation is certified by this frontend extraction. Record its verification separately using `EVALUATION.md`.

## Concurrency and unsupported capabilities

The browser preserves the idempotency key after transport failure or a server error while the same form and payload remain mounted. It does not persist live operation keys across tab reloads. The backend must provide a reconciliation workflow before retrying an uncertain payment after a reload; do not claim durable offline queuing or exactly-once delivery from this frontend.

Organization and staff changes send the displayed `currentStatus` / `isActive` as preconditions. The backend must validate current state and return 409 on a stale change instead of blindly toggling again. Those fields convey the requested interaction, not permission to perform it.

The current input collection for admission is a single command; it does not expose proposal approval or expected-version selection. If the intended backend requires those steps, extend the operation contract and user flow explicitly. Return 501 or an agreed unsupported-capability error for unavailable behavior. Do not implement policy in the frontend adapter to make the screen appear successful.

Every money field in wire view contracts ends in `Paise` and is a decimal string. The existing native UI uses safe-integer display models. Values outside that display range are rejected rather than rounded. JSON commands send decimal paise strings directly; no database key, table, or ORM choice is prescribed.

## Native component adaptation

The source pilot uses actual `@astryx-svelte/core` 0.5.2 components and its Neutral theme. Application styles remain in sibling StyleX modules. Date fields use native `input[type=date]` with token-based 44px sizing: inspection found the package’s DateInput exposed smaller calendar/input hit areas despite a larger wrapper. Keep the label, field name, browser picker, and minimum size when updating this choice.
