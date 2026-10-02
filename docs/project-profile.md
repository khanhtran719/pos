# Project profile

Adopted local decisions for pos-icool. This profile remains consistent with the canonical rules and architecture routed by `AGENTS.md`.

## Deployable apps

Three NestJS modular monoliths share one repository and one dependency tree. Each process is stateless and may run as several replicas behind a load balancer. Business modules are added under `apps/<app>/src/modules/<capability>/` when a capability is assigned. No sample business module is checked in.

| App       | Default port | PostgreSQL database | Compose service |
| --------- | ------------ | ------------------- | --------------- |
| `central` | 3000         | `central`           | `central`       |
| `ipos`    | 3001         | `ipos`              | `ipos`          |
| `kpos`    | 3002         | `kpos`              | `kpos`          |

An app does not import another app. Cross-app work waits for an explicit contract (HTTP or a later integration event). Inside one app, cross-module rules in `.ai/rules.md` still apply.

## Libraries

| Path                    | Alias              | Owns                                                                                          |
| ----------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `libs/shared`           | `@shared`          | Domain kernel, semantic error categories, `UnitOfWork` port, `CachePort`, and request context |
| `libs/infrastructure`   | `@infrastructure`  | PostgreSQL/Redis adapters, env validation, health endpoints, and shared HTTP bootstrap policy |

`@shared` does not import `@infrastructure`. Application code depends on the `UnitOfWork` and `CachePort` ports, not on `EntityManager` or a Redis client.

Kafka, outbox, workers, and schedulers are not part of this skeleton. Add them when a use case needs them, following `.ai/architecture.md`.

## Cache

All three apps use one Redis for cache-aside reads. Keys are `<app>:<module>:<purpose>:<identifier>`, built by `RedisKeyFactory`. PostgreSQL stays the source of truth. Each call site chooses its TTL. Invalidation happens after commit and is best-effort, so a value may stay stale until that TTL. Do not use the cache for an invariant or an authorization decision.

If Redis is down, `CachePort.get` behaves as a miss and `set` / `invalidate` log and return. The process still serves traffic. `/ready` does not check Redis.

## Database

PostgreSQL is the source of truth. There is no v1 schema and no migration toolchain.

`synchronize` is `false`. Schema changes are applied outside this repository until a migration approach is chosen. Do not add `migrations/` or a TypeORM CLI data source as part of ordinary feature work.

Application code reads `DB_HOST` and does not select replicas or implement failover.

## Runtime configuration

Each app loads only its own env file: `apps/<app>/.env`. Variable names are shared because the processes are separate:

```text
APP_NAME
PORT
NODE_ENV
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_DATABASE
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
ACCESS_TOKEN_SECRET
ACCESS_TOKEN_EXPIRES_IN
REFRESH_TOKEN_SECRET
REFRESH_TOKEN_EXPIRES_IN
```

Authentication configuration is required by all three apps. The two token-secret variables must be non-empty; expiry values default to `15m` and `7d` when omitted. Committed `.env.example` files contain placeholders only. Real secrets come from the deployment platform.

Token secrets must contain at least 32 characters. Expiry values use a positive duration such as `15m` or `7d`; invalid values stop startup.

## Central authentication

`central` exposes:

| Method | Route               | Authentication | Purpose                         |
| ------ | ------------------- | -------------- | ------------------------------- |
| POST   | `/api/auth/login`   | Public         | Login with `sale` and `pin`     |
| POST   | `/api/auth/refresh` | Refresh token  | Rotate the token pair           |
| POST   | `/api/auth/logout`  | Bearer token   | Revoke the current session      |
| GET    | `/api/auth/me`      | Bearer token   | Read the current active user    |

PIN values in `Users.Pin` are bcrypt hashes. `Users.Pin` and `Users.Pass` are excluded from default TypeORM selects; the user module exposes a narrow authentication capability to auth instead of allowing auth to query another module's table.

Access and refresh JWTs carry only `sub`, `sid`, token type, standard timestamps, and a unique token ID. The `Sessions` table stores only a SHA-256 refresh-token fingerprint, expiry, rotation timestamp, and revocation timestamp—never raw tokens. Refresh is serialized with a PostgreSQL row lock. A reused rotated refresh token revokes that session. Protected requests verify both the access signature and the current session/user state, so logout or account locking takes effect immediately.

Because the repository has no migration program, operators must provision the `Users` and `Sessions` mappings represented by their TypeORM entities before enabling these routes. Schema provisioning remains outside ordinary API changes until a migration strategy is adopted. Production ingress must rate-limit login and refresh attempts; do not add replica-local in-memory throttling to horizontally scaled processes.

`/live` checks the process only. `/ready` treats PostgreSQL as a critical dependency. Optional dependencies must not be added to readiness by default. Both stay outside the `/api` prefix and the API response envelope. A healthy endpoint returns `{ "status": "ok" }`; unavailable readiness returns HTTP 503 with `{ "status": "error" }`.

## HTTP bootstrap

All three apps call `configureHttpApplication`. The shared policy enables shutdown hooks, environment-based logger levels, Helmet, compression, cookie parsing, the simple query parser, 5 MB JSON/form limits, global validation, request context, the response envelope, and exception mapping. `/live`, `/ready`, and `/metrics` remain outside `/api`. App entry points own only app configuration, port/name lookup, listen, and the startup log.

## Request context

Every HTTP request has a `requestId` and `correlationId`. The server preserves non-empty `x-request-id` and `x-correlation-id` headers; otherwise it generates a request ID and uses it as the correlation ID. Both identifiers are returned as response headers and are available through `RequestContext` for logs and later outbound adapters. They are technical metadata, not domain state and not response-body fields.

## HTTP response

An API response body uses these fields:

```json
{
  "data": null,
  "errorCode": null,
  "message": null,
  "status": true
}
```

`data` is the response DTO, an array of those DTOs, or `null`. `status` is a boolean: `true` on success and `false` on failure. On success `errorCode` is `null`. On failure `data` is `null`, and `errorCode` and `message` both carry the same safe client text. Clients already read `errorCode` as that text. A stable domain name such as `InvoiceAlreadyPaidError` stays on the error class. It is not a body field, and the body has no `code` or `requestId`.

The global API response interceptor wraps ordinary response DTOs in this success envelope. A controller returning `PageResult<T>` is mapped to `data: items` plus the pagination `metadata`. `/live` and `/ready` bypass this interceptor.

Client-visible domain/application errors declare a transport-neutral `ErrorCategory`. HTTP maps `BadInput` → 400, `Unauthorized` → 401, `Forbidden` → 403, `NotFound` → 404, `Conflict` → 409, `BusinessRule` → 422, and `RateLimited` → 429. Unknown technical failures return the safe 500 envelope and never expose their raw message.

`metadata` is present only on a paginated API. It is a sibling of `data`, not a property inside `data`. A non-paginated response omits `metadata`.

```json
{
  "data": [],
  "metadata": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "lastPage": 1,
    "next": false
  },
  "errorCode": null,
  "message": null,
  "status": true
}
```

`page`, `pageSize`, `total`, and `lastPage` are numbers. `next` is a boolean. This envelope is the local contract. It replaces the `{ code, message, requestId }` example in `.ai/architecture.md` §46 and the wire code in `.ai/rules.md` R-35.

## Local deployment

`docker-compose.yml` runs PostgreSQL 16, Redis 7, and the three apps. The database password in that file is for local development only. Redis has no password in that file.

```text
docker compose up --build
```

Dev loop from the repository root, after copying the env example for the app you are running:

```text
npm run start:central:dev
npm run start:ipos:dev
npm run start:kpos:dev
```
