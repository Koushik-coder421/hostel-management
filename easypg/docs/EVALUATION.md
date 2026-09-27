# Independent backend evaluation

Use this frontend to reduce duplicated interface work while allowing independent backend designs. The colleague’s Express/MySQL implementation and the existing SvelteKit/PostgreSQL implementation may choose different entities, relationships, persistence techniques, and transaction protocols.

The exercise compares complete implementations. It cannot isolate a database engine’s performance or establish that one framework is inherently superior.

## Agree on outcomes before testing

Create a shared scenario register. Each scenario needs an identifier, business meaning, starting synthetic state, actor and scope, request sequence, expected observable outcome, and required evidence. Record unsupported operations explicitly. Do not hide them in a frontend adapter or silently substitute an approximation.

The native pilot’s existing screens are the initial integration scope. More advanced scenarios such as approval proposals, exclusive-use authorization, transfers, or historical reconstruction require an agreed contract and backend support before they can be treated as delivered workflows.

| Area | Questions and candidate scenarios |
| --- | --- |
| Domain meaning | What are a person, stay, agreement, room commitment, payment, and allocation? Can the model represent their distinct lifecycles? |
| Relationships | Can references cross an organization or hostel incorrectly? What prevents orphaned or contradictory records? |
| History | Can a prior allocation and accepted price be reconstructed after a move or price change? |
| Authorization | Do direct API requests reject an out-of-scope actor, regardless of hidden UI controls? |
| Concurrency | What happens when two independent requests compete for the same last bed? |
| Atomicity | Does a failure late in admission leave no partial occupancy, billing, or audit result? |
| Retry behavior | Does a repeated payment/admission with the same idempotency key create one logical operation? What happens when its payload changes? |
| Financial integrity | Are money values exact? Do invoice, allocation, payment, refund, and report totals reconcile under agreed definitions? |
| Time | How do operational dates, midnight boundaries, time zones, effective periods, and past/future inputs behave? |
| Change and recovery | Can migrations, organizational changes, backup restores, and upgrades preserve agreed invariants and history? |

For each invariant, each implementer documents where it is enforced, what can bypass it, and the executable test proving the guarantee. Do not mandate one table structure or assume every rule belongs in a SQL check constraint.

## Three separate evidence sets

1. **Database tests:** use the real selected engine to test referential integrity, constraints, transaction rollback, relevant direct writes, and simultaneous operations. Frontend mocks cannot provide this evidence.
2. **API business tests:** call endpoints without the UI. Test scope, current authorization, invalid input, stale state, conflicts, retries, and complete business outcomes.
3. **Frontend end-to-end tests:** verify navigation, filters, forms, touch interaction, loading/error states, authentication expiry, and understandable outcomes using the contract.

Maintain separate results for demo tests, live contract tests, and each backend’s database tests. A green demo suite proves only the simulated presentation path. A green contract suite proves interface agreement, not all business invariants.

## Performance protocol

Run correctness scenarios first. Name the operation and workload before recording timings. Record application commits, API contract version, hardware, engine/version, isolation level, indexes, connection pool, data distribution, record volume, offered load, warm-up, duration, and run count.

Report p50/p90/p95/p99 latency, error rate, throughput, and resource use. Distinguish successful business operations per second from HTTP requests per second and SQL statements per second. Use repeatable synthetic business data, allowing each backend to load it into its own schema. Keep offered load controlled when response times increase.

Frontend measurements should include route startup, interaction response, mobile overflow, and accessibility. Compare equivalent rendered workflows, not merely bundle sizes. Record unavailable or failed scenarios without assigning invented scores.

## Result template

| Scenario ID | Implementation/version | Dataset/configuration | Expected outcome | Observed outcome | Pass/fail/unsupported | Evidence path |
| --- | --- | --- | --- | --- | --- | --- |
| To be filled during evaluation | | | | | | |

Keep a brief discrepancy record identifying whether a failure belongs to presentation, transport contract, business rules, persistence, deployment, or measurement. Re-run affected scenarios after changes and retain prior results for comparison.
