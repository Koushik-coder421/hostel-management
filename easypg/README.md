# EasyPG frontend

A standalone frontend extracted from EasyPG’s Svelte native pilot. It preserves the Astryx Svelte components, StyleX styling, screens, and interaction patterns while replacing the original application backend with a browser API boundary.

The default demo uses synthetic records. An independently developed Express/MySQL backend can implement the live interface. This repository contains no PostgreSQL/MySQL schema, migrations, database access, original business services, or authentication server. No database or Docker installation is required to review the demo.

## Run locally

Use Node.js 22.12 or newer and pnpm 11.25.0 (the pinned package manager). Install dependencies, optionally copy the public configuration example, then start the development server:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://127.0.0.1:5180`. Use the demo login controls supplied by the application. Demo interactions illustrate presentation behavior; they are not persistence or authorization guarantees.

## Modes

| Setting | Demo | Live |
| --- | --- | --- |
| `VITE_API_MODE` | `demo` (default) | `live` |
| `VITE_API_BASE_URL` | Ignored for data access | `/api/v1` by default |
| Data | Synthetic browser fixtures | External API |
| Authentication | Demonstration only | Backend session and permissions |
| Backend outage | Not applicable | Visible error; never demo fallback |

These are public, build-time variables. Never place passwords, signing keys, or database connection strings in `VITE_` variables. Change configuration before building; deploy separate builds for separate backend environments.

## Build and verify

```sh
pnpm verify:boundary
pnpm check
pnpm test:unit
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test` runs the project’s full verification sequence. Read the actual command results for evidence; passing frontend tests does not certify an external backend or database.

The static build is written to `build/`. Configure the host to serve its `index.html` fallback for application routes. Route `/api/v1` to the backend before applying that fallback: an API error must not become an HTML success page. SvelteKit server actions and server routes are not available in this deployment.

## Handoff

- [Integration contract and checklist](docs/INTEGRATION.md)
- [OpenAPI 3.1 contract](docs/openapi.json)
- [Verification evidence and limitations](docs/VERIFICATION.md)
- [Independent implementation evaluation](docs/EVALUATION.md)
- [Source provenance](docs/PROVENANCE.md)
- [Instructions for contributing agents](AGENTS.md)

The original full-stack implementation is a separate project. This extraction does not require the colleague to adopt its schema, services, ORM, or backend framework. The frontend communicates presentation requirements and agreed business requests; each backend remains responsible for its own correct implementation.

## Demo scope

The demo accounts are `manager@example.invalid`, `owner@example.invalid`, and `admin@example.invalid`, with the fixture-only password `demo-only`. The login shortcuts select these accounts. Changes remain in this tab’s session storage and survive reload; sign out and choose an account to reset the sample dataset. Do not enter real resident data in the demo.

The handoff preserves the native pilot screens: dashboard, organizations, properties, staff, rooms/beds, residents/detail, admission, departure, payments, reports, and settings. It does not merge the sovereign branch’s visitor, maintenance-ticket, or KYC modules. There is no resident self-service screen in this pilot.

Admission simulation updates the displayed stay and inventory; it does not generate an invoice or implement deposit settlement. Existing sample invoices support payment interaction review. Approval proposals, exclusive-room approval, transfers, automatic billing, document storage, and real payment processing require agreed backend capabilities and any corresponding UI work. They are not silently supplied by the live adapter.

Regenerate the machine-readable wire schema and OpenAPI document after contract changes:

```sh
pnpm contract:generate
```
