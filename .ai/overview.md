# NestJS Modular Monolith Overview

> Map for 360 Customer v2. Normative constraints live in [rules](rules.md), execution contracts in [architecture](architecture.md), code shape in [conventions](conventions.md), process in [workflow](workflow.md), and local facts in the [project profile](../docs/project-profile.md). Named business domains in examples are illustrative.

## System shape

The system begins as a **modular monolith**. Business capabilities own their state and behavior. Inside a module, use DDD-lite and ports/adapters only where they clarify a real invariant or dependency. CQRS-lite separates optimized reads from write-side business behavior when useful. Redis and Kafka are infrastructure, not required dependencies of every use case.

```text
HTTP / Kafka / Scheduler / Worker
             │
             ▼
       Presentation adapter
             │
             ▼
      Application use case
        │           │
        ▼           ▼
     Domain       Ports
                    ▲
                    │
              Infrastructure
```

## Ownership and flow

An owning business module controls its invariants, persistence, and public capabilities. Other modules call a facade or port when an immediate answer is required; otherwise they may react to a versioned integration event. A module does not reach into another module's repository or ORM entity. Reporting reads may cross data boundaries under the explicit read-side exception in [architecture §29](architecture.md#29-reporting-architecture).

A write use case makes its transaction boundary visible. Domain behavior validates state transitions; repositories persist the aggregate; an outbox row is committed with the business change when an integration event must follow. A publisher emits that event after commit. Consumers must be idempotent. A read query may use optimized SQL or a projection without rebuilding an aggregate.

## Data and operations

Each deployable app owns its PostgreSQL database. This repository has no migration program; see the [project profile](../docs/project-profile.md). Redis may cache or coordinate with an explicit failure policy when used. External systems are accessed through application ports and infrastructure adapters. HTTP, Kafka, worker, and scheduler entry points, when present, share the same application and domain rules. Authentication, authorization, error mapping, logging, metrics, tracing, and health checks belong at their appropriate boundaries. API bodies use `{ data, errorCode, message, status }`. `metadata` is included only for a paginated API. `/live` and `/ready` stay outside that envelope. See the [project profile](../docs/project-profile.md).

## Start here

- [AGENTS.md](../AGENTS.md) routes tasks to the correct documents.
- [Rules](rules.md) lists enforceable constraints.
- [Architecture](architecture.md) explains the full API, transaction, messaging, cache, security, and deployment flows.
- [Workflow](workflow.md) describes how to execute and validate a task.
- [Conventions](conventions.md) owns names and code shape.
- [Module template](module-template.md) contains illustrative code, including a fictional Invoice module.

These documents define the target architecture. Create only the modules and infrastructure the current code needs. Kafka and outbox stay absent until a use case requires them. Redis cache is wired for every app; see the project profile for its failure and staleness rules.
