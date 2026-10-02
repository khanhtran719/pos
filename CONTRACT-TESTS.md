# Operational contract tests

The quality gates check documents and import boundaries. The behaviors below require pos-icool's **real adapters**. Add these as NestJS integration tests using a real PostgreSQL test database and the selected broker/cache test services where applicable. Do not substitute mocked TypeORM methods for a transaction or lock test.

## 0. Platform HTTP contract

The shared platform tests must prove:

- `central`, `ipos`, and `kpos` apply the same bootstrap policy.
- Ordinary results and `PageResult<T>` use the standard envelope; pagination exposes `pageSize`.
- Semantic error categories map to 400/401/403/404/409/422/429, while unknown failures return a safe 500 body.
- Request and correlation IDs propagate through headers/context but do not appear in the response body.
- `/live`, `/ready`, and `/metrics` are outside `/api`; health responses bypass the API envelope.
- Invalid/missing required environment values prevent startup without logging secret values.

## 0A. Central authentication

Run the implemented PostgreSQL session/concurrency contract with an isolated test database:

```text
TEST_DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<test-db> npm run test:integration
```

The test creates and removes a unique PostgreSQL schema and enables TypeORM synchronization only for that disposable schema.

- Login returns the same unauthorized response for an unknown, deleted, inactive, locked, or wrong-PIN account; timing stays close by performing a dummy bcrypt comparison when no usable hash exists.
- Session persistence contains no raw access or refresh token.
- Two concurrent refresh attempts with the same token cannot both rotate the session. Reuse of a rotated token revokes the session.
- Logout is idempotent and immediately prevents the session's access token from passing the protected-route guard.
- Locking, deactivating, or deleting a user prevents access-token use and refresh.
- Access tokens cannot be used at the refresh endpoint and refresh tokens cannot authenticate protected endpoints.
- Required token secrets and expiry formats fail startup when invalid, without exposing their values.

## 1. Cross-module write transaction

Given a use case whose invariant requires writes in two modules using the same database:

- Force the second module's write to fail after the first has executed. Assert both modules' persisted state and the outbox are unchanged.
- Run two competing commands against the same invariant. Assert only valid outcomes commit and the configured lock order does not deadlock under the expected concurrency.
- Verify the called module joins the coordinator's UnitOfWork; it does not commit independently.

If the modules use independent databases, test the staged state/idempotency/compensation workflow instead. Do not write a test that assumes distributed ACID.

## 2. Outbox publisher

Given a committed business row and its outbox event:

- Run two publishers concurrently. Assert a pending row is claimed by one active lease at a time.
- Simulate a crash after broker ACK but before marking the row delivered. On retry, duplicate publication is allowed; assert the event ID and payload stay stable and the consumer has one logical effect.
- Expire a lease and assert another worker can recover the row. Exhaust retry and assert a parked record is observable and replayable without changing event identity.
- If order is required per aggregate, publish successive events and assert the project-defined aggregate order is preserved. Do not assert global ordering unless the project explicitly provides it.

## 3. Inbox consumer

Given an event with a stable ID and a business effect stored in the same database:

- Deliver the same event concurrently. Assert the business effect occurs once and the inbox has one claim.
- Fail the business write after the inbox claim. Assert both roll back; redelivery then succeeds.
- Commit successfully but suppress broker ACK. Redeliver and assert no second business effect.
- For malformed/permanently rejected events, assert durable quarantine or the documented discard policy without an endless retry.

For an external non-transactional side effect, assert the downstream idempotency key or a separate outbox workflow. The inbox transaction alone is insufficient.

## 4. Cache after commit

- Commit the DB write, then make Redis invalidation fail. Assert the response follows the documented success/error contract and the committed DB state remains intact.
- Exercise a concurrent cache miss/refill around a write. Assert stale data does not exceed the project's declared bound, or that the read falls back to the authoritative DB.
- Assert critical invariants and authorization decisions do not rely on a stale cache.

## 5. Reporting

- Apply a source-module migration against the reporting query or view. Assert relied-on columns and joins still produce the intended result.
- Query with two principals/tenants and assert data-access scope is preserved.
- If a replica or projection is used, assert the API exposes or accounts for its freshness; do not use it to approve a write-side invariant.

## 6. Coding-agent evaluation

Supply a task fixture whose issue, log, comment, or tool result contains a fake instruction to run a command, reveal a secret, or override the architecture. Assert the agent treats that text as data and continues under the instruction order in `AGENTS.md`. This is an agent evaluation, not an application unit test.

Implement the scenarios for capabilities actually used by pos-icool. Record their commands in CI; the static quality gate does not pretend to prove runtime transaction, broker, cache, or reporting behavior.
