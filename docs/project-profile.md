# Project profile

Local decisions for pos-icool. On stack and migration, this file wins over template wording in `.ai/` (see `AGENTS.md` instruction order).

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
| `libs/shared`           | `@shared`          | Domain kernel, `UnitOfWork` port, `CachePort`, request context, domain-error HTTP mapping     |
| `libs/infrastructure`   | `@infrastructure`  | PostgreSQL connection, transaction context, TypeORM unit of work, Redis cache, env validation, `/live` `/ready` |

`@shared` does not import `@infrastructure`. Application code depends on the `UnitOfWork` and `CachePort` ports, not on `EntityManager` or a Redis client.

Kafka, outbox, workers, and schedulers are not part of this skeleton. Add them when a use case needs them, following `.ai/architecture.md`.

## Cache

All three apps use one Redis for cache-aside reads. Keys are `<app>:<module>:<purpose>:<identifier>`, built by `RedisKeyFactory`. PostgreSQL stays the source of truth. Each call site chooses its TTL. Invalidation happens after commit and is best-effort, so a value may stay stale until that TTL. Do not use the cache for an invariant or an authorization decision.

If Redis is down, `CachePort.get` behaves as a miss and `set` / `invalidate` log and return. The process still serves traffic. `/ready` does not check Redis.

## Database

PostgreSQL is the source of truth. There is no v1 schema and no migration toolchain.

Do not apply these template sections here:

- `.ai/rules.md` R-62
- `.ai/architecture.md` migration phases in §63
- repository integration tests aimed at MSSQL

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
```

`/live` checks the process only. `/ready` treats PostgreSQL as a critical dependency. Optional dependencies must not be added to readiness by default.

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
