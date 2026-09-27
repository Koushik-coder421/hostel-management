# Source provenance

This is a fresh frontend extraction, not a clone of the full-stack Git history.

- Source: EasyPG native Astryx/StyleX pilot working copy.
- Source Git HEAD: `4fec985e58c23a7d671743e7abc12ffcab02c8f8`.
- Snapshot date: 2026-09-23 (Asia/Kolkata).
- Source state: dirty working copy; selected frontend files include uncommitted changes. The HEAD alone cannot reproduce this snapshot.
- Source was treated as read-only during extraction. Backend source, schemas, migrations, authentication server, environment secrets, and prior application history are excluded.
- The sovereign implementation is a separate comparison track and was not merged into this frontend.

Astryx dependencies in this handoff are the Svelte packages named in `package.json`, including `@astryx-svelte/core` and `@astryx-svelte/theme-neutral` at 0.5.2, with StyleX 0.19.0. The lockfile and build configuration belong to the handoff; an upstream React package is not a drop-in replacement.

The following is an extraction-time frontend filename manifest, including newly authored boundary files available at capture time. It contains filenames only, not backend code, data, or secrets. Later handoff commits may add or refine API files and tests; Git tracks those changes.

```text
src/app.css
src/app.d.ts
src/app.html
src/lib/api/client.ts
src/lib/api/config.ts
src/lib/api/contracts.ts
src/lib/api/demo-identities.ts
src/lib/api/demo.ts
src/lib/api/errors.ts
src/lib/api/fixtures.ts
src/lib/api/forms.ts
src/lib/api/http.ts
src/lib/api/load.ts
src/lib/api/operations.ts
src/lib/api/transport.ts
src/lib/api/validate.ts
src/lib/api/wire.schema.json
src/lib/assets/favicon.svg
src/lib/components/app-shell/AppShell.svelte
src/lib/components/app-shell/Brand.svelte
src/lib/components/app-shell/Header.svelte
src/lib/components/app-shell/Sidebar.svelte
src/lib/components/app-shell/ThemeToggle.svelte
src/lib/components/app-shell/icons.ts
src/lib/components/app-shell/shell.stylex.ts
src/lib/components/patterns/MetricCard.stylex.ts
src/lib/components/patterns/MetricCard.svelte
src/lib/constants/navigation.ts
src/lib/constants/permissions.ts
src/lib/design/appearance.svelte.ts
src/lib/design/attrs.ts
src/lib/design/table.stylex.ts
src/lib/formatters/date.ts
src/lib/formatters/money.ts
src/lib/index.ts
src/routes/(app)/+layout.svelte
src/routes/(app)/+layout.ts
src/routes/(app)/check-ins/+page.svelte
src/routes/(app)/check-ins/+page.ts
src/routes/(app)/check-ins/page.stylex.ts
src/routes/(app)/check-outs/+page.svelte
src/routes/(app)/check-outs/+page.ts
src/routes/(app)/check-outs/page.stylex.ts
src/routes/(app)/dashboard/+page.svelte
src/routes/(app)/dashboard/+page.ts
src/routes/(app)/dashboard/page.stylex.ts
src/routes/(app)/hostels/+page.svelte
src/routes/(app)/hostels/+page.ts
src/routes/(app)/hostels/page.stylex.ts
src/routes/(app)/managers/+page.svelte
src/routes/(app)/managers/+page.ts
src/routes/(app)/managers/page.stylex.ts
src/routes/(app)/organizations/+page.svelte
src/routes/(app)/organizations/+page.ts
src/routes/(app)/organizations/page.stylex.ts
src/routes/(app)/payments/+page.svelte
src/routes/(app)/payments/+page.ts
src/routes/(app)/payments/page.stylex.ts
src/routes/(app)/reports/+page.svelte
src/routes/(app)/reports/+page.ts
src/routes/(app)/reports/page.stylex.ts
src/routes/(app)/residents/+page.svelte
src/routes/(app)/residents/+page.ts
src/routes/(app)/residents/[id]/+page.svelte
src/routes/(app)/residents/[id]/+page.ts
src/routes/(app)/residents/[id]/page.stylex.ts
src/routes/(app)/residents/page.stylex.ts
src/routes/(app)/rooms/+page.svelte
src/routes/(app)/rooms/+page.ts
src/routes/(app)/rooms/page.stylex.ts
src/routes/(app)/settings/+page.svelte
src/routes/(app)/settings/+page.ts
src/routes/(app)/settings/page.stylex.ts
src/routes/(auth)/+layout.svelte
src/routes/(auth)/login/+page.svelte
src/routes/(auth)/login/+page.ts
src/routes/(auth)/login/page.stylex.ts
src/routes/+error.svelte
src/routes/+layout.svelte
src/routes/+layout.ts
src/routes/+page.svelte
src/routes/+page.ts
src/stylex.d.ts
```
