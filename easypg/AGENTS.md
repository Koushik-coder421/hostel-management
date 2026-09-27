# Frontend boundary

This project is a standalone SvelteKit SPA using Astryx Svelte components and StyleX. Its purpose is to share presentation while keeping backend implementations independent.

## Required boundaries

- Keep all data access behind `src/lib/api/`. Components must not contact a database or contain authoritative business transactions.
- Never copy original EasyPG backend services, database schemas/migrations, Better Auth server configuration, credentials, resident data, or original repository history into this repository.
- Do not add `$lib/server`, `.server` modules, SvelteKit server actions, remote server functions, database clients, or a runtime application server to solve frontend integration issues.
- Demo and live are explicit modes. A live request failure must remain an error; never substitute demo data.
- Demo role selection is presentation simulation. It is not an identity, permission grant, or input the backend should trust.
- Use browser-safe DTOs independent of database schemas. IDs are opaque strings. Money crosses JSON as integer decimal strings in paise; use the boundary decoder and reject amounts outside the presentation layer’s safe integer range.
- Backend requests must express one business operation. Do not coordinate multiple database-like writes in a component or reproduce domain enforcement in an adapter.
- Preserve Astryx/StyleX. Do not introduce shadcn, Tailwind, or a replacement design system. Missing components should use the existing component and token conventions with documented accessibility behavior.
- Use synthetic fixtures only. Do not copy screenshots or fixtures containing real personal information.

## Working method

Inspect the existing API contracts, client, mock implementation, and operation catalog before changing a screen. Update the documented contract alongside a request/response change. Adapters may translate field/path names; they must not fabricate approval, balances, permissions, or unsupported capabilities.

Keep visible loading, validation, empty, failure, conflict, and success states. Preserve minimum 44px touch targets and verify 390×844 mobile width without horizontal page scrolling. Keep keyboard focus and accessible labels usable.

Run `pnpm verify:boundary`, `pnpm check`, `pnpm test:unit`, `pnpm build`, and `pnpm test:e2e` for a handoff. Record failures honestly. Frontend success is not backend verification. Do not alter or reset either source comparison application while working here.
