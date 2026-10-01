# Backend Architecture

> **Document status:** Normative architecture and execution contract.  
> This file owns the detailed API, worker, transaction, and integration flows. The concise enforceable catalog is in [rules](rules.md); [AGENTS.md](../AGENTS.md) defines document precedence and task routing.  
> When implementation and this document conflict, identify the cause and deliberately update the implementation or the owning rule. Never silently break an architectural boundary.

> **Project context:** This is the target architecture for pos-icool. PostgreSQL is the source of truth and the repository currently has no schema migration program. Invoice, Store, Loyalty, POS, vendor names, routes, and sample values remain illustrative. Kafka and Redis sections apply when those integrations are selected. See the [project profile](../docs/project-profile.md) for adopted local decisions.


## 1. Purpose

This document defines the target architecture for the three pos-icool NestJS modular monoliths: `central`, `ipos`, and `kpos`.

PostgreSQL is the source of truth. Database-specific schema mapping, SQL, locking behavior, and error translation stay in Infrastructure and are verified against the actual PostgreSQL behavior. The project does not currently own a migration toolchain; adopting one requires an explicit architecture decision and operational contract. See the [project profile](../docs/project-profile.md).

The reference model combines:

- Modular Monolith
- DDD-lite
- Clean Architecture
- Hexagonal Architecture / Ports & Adapters
- CQRS-lite
- Repository Pattern
- Unit of Work
- Transaction Context with `AsyncLocalStorage`
- Transactional Outbox
- Event-Driven Integration
- Kafka
- Redis
- Security boundaries
- Observability
- Background Workers
- Resilience patterns
- Horizontal scaling / HA-ready deployment

Module ownership, dependency direction, and business invariants are core. Transactional Outbox, Kafka, Redis, particular persistence adapters, and HA deployment details apply when the adopting project's requirements and stack call for them. Their presence here is not an instruction to install every component.

The goal is not to maximize abstraction.

The goal is to create clear boundaries so that:

1. Business logic stays independent from framework and infrastructure details.
2. Business modules own their data and behavior.
3. TypeORM, Redis, Kafka, HTTP clients, and other technologies stay behind ports/adapters.
4. Database transactions can span multiple repositories without leaking `EntityManager`.
5. Cross-module coupling stays controlled.
6. Read-heavy/reporting use cases can be optimized independently from write-side domain logic.
7. The application can scale horizontally.
8. Selected modules can be extracted into microservices later without redesigning the whole system.

---

# 2. Architecture Style

The macro architecture is:

```text
Modular Monolith
    +
DDD-lite
    +
Clean / Hexagonal Boundaries
    +
CQRS-lite
    +
Event-Driven Integration
```

This means the application is deployed as one logical backend initially, but business boundaries are designed as if modules were independent systems.

Do not treat this architecture as microservices.

Do not introduce distributed-system complexity unless required.

---

# 3. High-Level Runtime Architecture

The diagram below is a reference deployment with optional Redis and Kafka capabilities. A project need not deploy every component to follow the module and layer boundaries.

```text
                         Clients
                  Web / Mobile / POS
                         |
                         v
                API Gateway / LB
                         |
         +---------------+---------------+
         |               |               |
         v               v               v
      API #1          API #2          API #3
         |               |               |
         +---------------+---------------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    PostgreSQL     Redis          Kafka
       Cluster         Cluster        Cluster
```

The API layer should remain stateless where possible.

Horizontal scaling must not depend on in-memory session state.

---

# 4. Application Layering

```text
Presentation
     |
     v
Application
     |
     v
Domain / Ports
     ^
     |
Infrastructure
```

The dependency direction is critical.

## Allowed

```text
Presentation -> Application
Application  -> Domain
Application  -> Ports
Infrastructure -> Domain
Infrastructure -> Application Ports
```

## Forbidden

```text
Domain -> Infrastructure
Application -> TypeORM
Application -> Redis client
Application -> Kafka producer
Application -> HTTP implementation
Module A -> Module B repository
Module A -> Module B ORM entity
```

---

# 5. Target Project Structure

The tree is a placement guide. Create only the modules and infrastructure integrations that the adopting project actually needs.

```text
src/
|
|-- main.ts
|-- app.module.ts
|
|-- config/
|   |-- app.config.ts
|   |-- database.config.ts
|   |-- redis.config.ts
|   |-- kafka.config.ts
|   |-- observability.config.ts
|   |-- config.validation.ts
|   `-- config.module.ts
|
|-- shared/
|   |
|   |-- domain/
|   |   |-- entity.ts
|   |   |-- aggregate-root.ts
|   |   |-- value-object.ts
|   |   |-- domain-event.ts
|   |   `-- exceptions/
|   |
|   |-- application/
|   |   |-- unit-of-work/
|   |   |   |-- unit-of-work.port.ts
|   |   |   `-- unit-of-work.constants.ts
|   |   |
|   |   |-- pagination/
|   |   |   |-- page-request.ts
|   |   |   |-- page-result.ts
|   |   |   `-- index.ts
|   |   `-- ports/
|   |
|   `-- common/
|       |-- decorators/
|       |-- guards/
|       |-- interceptors/
|       |-- filters/
|       |-- pipes/
|       |-- errors/
|       `-- utils/
|
|-- modules/
|   |
|   |-- invoice/
|   |   |-- invoice.module.ts
|   |   |
|   |   |-- domain/
|   |   |   |-- entities/
|   |   |   |-- value-objects/
|   |   |   |-- repositories/
|   |   |   |-- services/
|   |   |   |-- events/
|   |   |   |-- enums/
|   |   |   `-- errors/
|   |   |
|   |   |-- application/
|   |   |   |-- commands/
|   |   |   |-- queries/
|   |   |   |-- services/
|   |   |   |-- facades/
|   |   |   |-- dto/
|   |   |   `-- ports/
|   |   |
|   |   |-- infrastructure/
|   |   |   `-- persistence/
|   |   |       `-- typeorm/
|   |   |           |-- entities/
|   |   |           |-- repositories/
|   |   |           `-- mappers/
|   |   |
|   |   `-- presentation/
|   |       `-- http/
|   |           |-- invoice.controller.ts
|   |           `-- dto/
|   |
|   |-- member/
|   |-- promotion/
|   |-- loyalty/
|   |-- room/
|   |-- shift/
|   |-- store/
|   `-- reporting/
|
|-- infrastructure/
|   |
|   |-- database/
|   |   |-- database.module.ts
|   |   |-- data-source.ts
|   |   |-- migrations/
|   |   `-- transaction/
|   |       |-- typeorm-transaction-context.ts
|   |       |-- typeorm-unit-of-work.ts
|   |       `-- typeorm-repository-provider.ts
|   |
|   |-- messaging/
|   |   `-- kafka/
|   |       |-- kafka.module.ts
|   |       |-- kafka.producer.ts
|   |       |-- kafka.consumer.ts
|   |       |-- serializers/
|   |       `-- retry/
|   |
|   |-- outbox/
|   |   |-- outbox.module.ts
|   |   |-- outbox.port.ts
|   |   `-- persistence/
|   |
|   |-- cache/
|   |   `-- redis/
|   |       |-- redis.module.ts
|   |       |-- redis-cache.adapter.ts
|   |       |-- redis-lock.adapter.ts
|   |       `-- redis-key.factory.ts
|   |
|   |-- security/
|   |   |-- authentication/
|   |   `-- authorization/
|   |
|   |-- integrations/
|   |
|   |-- observability/
|   |   |-- logging/
|   |   |-- tracing/
|   |   |-- metrics/
|   |   `-- audit/
|   |
|   `-- resilience/
|       |-- retry/
|       |-- timeout/
|       `-- circuit-breaker/
|
`-- workers/
    |-- kafka/
    |-- outbox/
    |-- scheduler/
    `-- reconciliation/
```

---

# 6. Business Module Ownership

A Nest module represents a **business capability**, not a database table.

Examples:

```text
InvoiceModule
PromotionModule
MemberModule
LoyaltyModule
RoomModule
ShiftModule
StoreModule
ReportingModule
```

Do not create modules such as:

```text
InvoiceItemModule
InvoiceVatModule
InvoiceDiscountModule
```

unless those concepts have an independent business lifecycle.

A table does not automatically imply a module.

---

# 7. Aggregate Ownership

Entities sharing the same business lifecycle should normally belong to the same aggregate/module.

Example:

```text
Invoice Aggregate
|
|-- Invoice
|-- InvoiceItem
|-- InvoicePayment
|-- InvoiceDiscount
|-- InvoiceVAT
|-- InvoiceCoupon
`-- InvoiceRequiredCharge
```

The application should usually persist the aggregate through one repository abstraction:

```ts
await invoiceRepository.save(invoice);
```

Avoid application code that knows persistence-table structure:

```ts
await invoiceRepository.save(invoice);
await invoiceItemRepository.save(items);
await invoicePaymentRepository.save(payments);
await invoiceVatRepository.save(vats);
```

Infrastructure may internally use multiple ORM repositories if required.

---

# 8. Domain Model

Domain code contains business behavior and invariants.

Example:

```ts
export class Invoice {
  pay(payment: Payment): void {
    if (this.status !== InvoiceStatus.OPEN) {
      throw new InvoiceCannotBePaidError();
    }

    this.payments.push(payment);
    this.status = InvoiceStatus.PAID;
  }
}
```

Domain code must not depend on:

```text
NestJS
TypeORM
database drivers
Redis
Kafka
HTTP
Axios
Express/Fastify
```

Domain code should model:

- Entities
- Aggregates
- Value Objects
- Domain Services
- Domain Events
- Domain Errors
- Business invariants

---

# 9. DDD-lite Rule

Do not force rich domain modeling into trivial CRUD modules.

Simple modules may use a simpler structure.

Example:

```text
modules/config/
|-- config.module.ts
|-- config.controller.ts
|-- config.service.ts
`-- config.orm-entity.ts
```

Use full domain/application/infrastructure separation only where business complexity justifies it.

Typical candidates:

```text
Invoice
Promotion
Loyalty
Payment
Room lifecycle
Order
```

---

# 10. Domain Entity vs ORM Entity

For complex modules:

```text
Domain Entity != ORM Entity
```

Example domain entity:

```text
modules/invoice/domain/entities/invoice.ts
```

Example persistence entity:

```text
modules/invoice/infrastructure/persistence/typeorm/entities/
invoice.orm-entity.ts
```

ORM entities may contain:

```ts
@Entity()
@Column()
@Index()
@OneToMany()
@ManyToOne()
```

Domain entities must not.

---

# 11. ORM Entity Ownership

Do not maintain one global folder:

```text
src/database/entities/
```

Prefer ownership by module:

```text
modules/invoice/infrastructure/persistence/typeorm/entities/
modules/member/infrastructure/persistence/typeorm/entities/
modules/promotion/infrastructure/persistence/typeorm/entities/
```

Shared database infrastructure should only contain technical database concerns:

```text
database.module.ts
data-source.ts
transaction/
migrations/
```

---

# 12. Application Layer

Application services orchestrate use cases.

Examples:

```text
CreateInvoice
PayInvoice
CloseInvoice
CancelInvoice
ApplyPromotion
AddMemberPoints
```

A use case should coordinate:

- Domain entities
- Repository ports
- Unit of Work
- Module ports/facades
- Domain events
- Outbox

Application code describes **what must happen**.

Infrastructure describes **how it happens technically**.

---

# 13. Preferred Use-Case Style

```ts
return this.unitOfWork.transaction(async () => {
  const invoice =
    await this.invoiceRepository.findForUpdate(invoiceId);

  invoice.pay(payment);

  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );

  return invoice;
});
```

Application code must not know that the implementation uses:

```text
PostgreSQL
TypeORM
EntityManager
QueryRunner
Repository<T>
```

---


# 13A. API Execution Contract

This section is the **mandatory operational contract** for implementing APIs.

An agent must not only place files in the correct folders; it must also implement the correct execution flow.

Before coding any endpoint/use case, classify the operation using the following questions:

```text
1. Is this a READ or a WRITE?

2. Which module owns this business capability?

3. Does it mutate an Aggregate/State?

4. Is a transaction required?

5. Is there a cross-module dependency?

6. Does the cross-module call need an immediate result, or can it use eventual consistency?

7. Does it produce an integration event?

8. Does it call an external API/network service?

9. Does it require cache/lock/idempotency?

10. Which errors are Domain Errors, Application Errors, or Technical Errors?

11. Which request context values must be propagated?

12. Which tests prove that this flow works correctly?
```

If the important questions above are not answered yet, implementation should not begin.

---

# 13B. Standard Write API Flow

Any API that changes business state should, by default, follow this flow:

```text
HTTP Request
     |
     v
Controller
     |
     v
Authentication / Authorization
     |
     v
Request DTO Validation
     |
     v
Application Use Case / Command
     |
     v
UnitOfWork.transaction()
     |
     +--> Load Aggregate / State
     |
     +--> Validate Current State
     |
     +--> Execute Domain Behavior
     |
     +--> Persist Aggregate
     |
     +--> Persist Outbox Event (if an integration event is required)
     |
     v
COMMIT
     |
     v
Application Result
     |
     v
Response Mapper
     |
     v
Response DTO
     |
     v
HTTP Response
```

Example:

```ts
@Post(':id/pay')
async pay(
  @Param('id') invoiceId: string,
  @Body() dto: PayInvoiceDto,
): Promise<PayInvoiceResponseDto> {
  const result = await this.payInvoice.execute({
    invoiceId,
    ...dto,
  });

  return PayInvoiceResponseMapper.toDto(result);
}
```

`PayInvoiceResponseDto` is the `data` value. The HTTP body is the envelope in §46, not the DTO alone.

Use case:

```ts
async execute(
  command: PayInvoiceCommand,
): Promise<PayInvoiceResult> {
  return this.unitOfWork.transaction(async () => {
    const invoice =
      await this.invoiceRepository.findForUpdate(
        command.invoiceId,
      );

    const payment = Payment.create({
      amount: command.amount,
      method: command.method,
    });

    invoice.pay(payment);

    await this.invoiceRepository.save(invoice);

    await this.outbox.add(
      InvoicePaidEvent.from(invoice),
    );

    return PayInvoiceResult.from(invoice);
  });
}
```

Mandatory responsibilities:

```text
Controller
    must not contain business rules.

Application
    must make the transaction boundary visible.

Domain
    decides whether a business state transition is valid.

Repository
    persists the Aggregate.

Outbox
    persists integration intent in the same DB transaction.

Infrastructure
    handles EntityManager / QueryRunner / SQL / Kafka mechanics.
```

For write use cases with real business logic, do not collapse the flow into:

```text
Controller
    -> TypeORM Repository
    -> save()
```

---

# 13C. Standard Read API Flow

A read API does not have to reconstruct a Domain Aggregate.

Standard flow:

```text
HTTP Request
     |
     v
Controller
     |
     v
Authentication / Authorization
     |
     v
Query DTO Validation
     |
     v
Application Query / Query Service
     |
     v
Read Repository / Query Object
     |
     v
Optimized QueryBuilder / SQL / Projection
     |
     v
Read Model / Read DTO
     |
     v
HTTP Response
```

Example:

```text
GET /invoices?page=1&pageSize=20
```

does not need to use:

```text
DB Row
  -> ORM Entity
  -> Domain Aggregate
  -> Mapper
  -> Response
```

when the endpoint only needs a projection.

It may use:

```text
SQL / QueryBuilder
    -> InvoiceListItemDto
```

Rule:

```text
Write side:
    prioritize Aggregate + invariant + ownership.

Read side:
    prioritize clear queries + performance + correct DTO contracts.
```

This is how the repository applies CQRS-lite.

---

# 13D. Standard Cross-Module Synchronous Flow

Use synchronous cross-module calls when the caller **needs an immediate result** in order to complete the use case.

Example: Invoice needs Promotion to calculate a discount before an invoice can be created.

Do not:

```text
InvoiceUseCase
    -> PromotionRepository
```

Do not:

```text
InvoiceUseCase
    -> PromotionOrmEntity
```

Prefer:

```text
InvoiceUseCase
      |
      v
PromotionFacade / PromotionPort
      |
      v
Promotion Application
      |
      v
Promotion Domain / Repository
      |
      v
Promotion Result
      |
      v
InvoiceUseCase continues
```

Example abstraction:

```ts
export interface PromotionPricingPort {
  calculate(
    input: PromotionPricingInput,
  ): Promise<PromotionPricingResult>;
}
```

The owning module keeps authority over its own business rules.

The caller only knows the public capability.

If the call writes through both modules, also follow the shared transaction contract in §27A; an immediate result alone is not a reason to couple their repositories.

---

# 13E. Standard Asynchronous Side-Effect Flow

Use events when the producer does not need the consumer to complete immediately.

Example after an Invoice is paid:

```text
PayInvoice Use Case
      |
      v
Invoice.pay()
      |
      v
InvoiceRepository.save()
      |
      v
Outbox.add(InvoicePaid)
      |
      v
COMMIT
      |
      v
Outbox Publisher / Debezium CDC
      |
      v
Kafka
      |
      +--------------------+
      |                    |
      v                    v
Loyalty Consumer      Analytics Consumer
      |                    |
      v                    v
AddPoints Use Case    Update Projection
```

Important points:

```text
Invoice transaction
    does not wait for the Loyalty transaction.

Invoice module
    does not inject LoyaltyRepository.

Producer
    does not need to know how many consumers exist.
```

A use case should choose asynchronous events only when eventual consistency is acceptable.

---

# 13F. Standard Kafka Consumer Flow

A Kafka Consumer is an inbound/presentation adapter.

Standard flow:

```text
Kafka Message
     |
     v
Consumer Adapter
     |
     +--> Deserialize
     |
     +--> Schema / Contract Validation
     |
     +--> Extract correlation metadata
     |
     v
UnitOfWork.transaction()
     |
     +--> Unique Inbox claim
     |       +--> duplicate: no business effect
     |
     +--> new event: Application Use Case / Command
     |       +--> Domain + Repository
     v
COMMIT
     |
     v
ACK
```

This atomic inbox form applies when the inbox and business effect share a database. See §36 for redelivery and external side-effect limits.

A consumer should not directly do:

```text
Kafka Handler
   -> QueryBuilder
   -> Update business table
```

unless the adapter is explicitly defined as an ETL/CDC synchronization pipeline that does not contain business invariants.

Consumers must handle duplicate delivery safely.

---

# 13G. Standard External Integration Flow

Application code must not call Axios/vendor SDKs directly.

Flow:

```text
Application Use Case
      |
      v
Integration Port
      ^
      |
Infrastructure Adapter
      |
      +--> Timeout
      +--> Retry policy
      +--> Circuit breaker
      +--> Mapping
      |
      v
External System
```

Example:

```ts
export interface PaymentGateway {
  charge(
    request: ChargeRequest,
  ): Promise<ChargeResult>;
}
```

Infrastructure:

```text
PaymentGateway
     ^
     |
VNPayAdapter
MoMoAdapter
```

### External calls and DB transactions

Do not default to:

```text
BEGIN

PostgreSQL row lock via Infrastructure

HTTP call 5-10 seconds

UPDATE

COMMIT
```

because a network call can keep locks and transactions open for too long.

Depending on the business workflow, prefer:

```text
Transaction 1
    -> persist pending state
    -> COMMIT

External call

Transaction 2
    -> persist result
    -> COMMIT
```

If the workflow is complex and requires compensation/retry/state transitions, use a state machine or Saga-like workflow rather than keeping a long-running DB transaction open.

---

# 13H. Standard Cache Flow

The default cache strategy is Cache-Aside.

## Read

```text
Application Query
      |
      v
CachePort.get()
      |
      +--> HIT
      |     |
      |     v
      |   return
      |
      +--> MISS
            |
            v
         Database
            |
            v
       CachePort.set()
            |
            v
          return
```

## Write

```text
Application Use Case
      |
      v
DB Transaction
      |
      v
COMMIT
      |
      v
Cache Invalidate / Refresh
```

Do not invalidate cache before commit.

Post-commit invalidation can still fail or race with a cache refill; §39 defines the required staleness decision and recovery options.

Every cache usage must define:

```text
Key format

TTL

Source of truth

Invalidation strategy

Stale-data tolerance

Redis failure behavior
```

If these are not defined yet, the cache should not be added.

---

# 13I. Standard Error Propagation Flow

Errors must respect architectural boundaries.

Flow:

```text
Domain
    |
    +--> Domain Error
    |
    v
Application
    |
    +--> propagate / translate application-specific error if needed
    |
    v
Presentation Exception Mapper
    |
    v
HTTP status + response envelope
```

The body is `{ data, errorCode, message, status }`. Add `metadata` only when the API is paginated. Field rules are in the [project profile](../docs/project-profile.md). Do not respond with `{ code, message, requestId }`.

Example Domain error:

```ts
throw new InvoiceAlreadyPaidError();
```

Presentation mapping:

```text
InvoiceAlreadyPaidError
    -> HTTP status
    -> { data: null, errorCode, message, status: false }
```

`errorCode` and `message` are the same safe client text. `InvoiceAlreadyPaidError` is the domain class name, not a body field.

Do not throw:

```ts
throw new ConflictException();
```

from Domain code.

Technical errors such as PostgreSQL connection failures must not expose raw messages, SQL, or stack traces to production clients.

---

# 13J. Standard Request Context Flow

Each inbound request/message should carry correlation context where appropriate.

```text
Inbound HTTP/Kafka
      |
      v
RequestContext
      |
      +--> requestId
      +--> traceId
      +--> correlationId
      +--> causationId (event)
      +--> userId
      +--> storeId
      |
      +--------------+--------------+
      |              |              |
      v              v              v
    Logs        External API      Outbox/Kafka
```

Agents should avoid manually passing many context fields through every method if the repository already provides a RequestContext abstraction.

Context is technical/request metadata, not Domain state.

---

# 13K. Standard Authorization Flow

Authorization must happen before sensitive operations, while business invariants still remain protected by Domain/Application logic.

Flow:

```text
Request
   |
   v
Authentication
   |
   v
Current Principal
   |
   v
Authorization / Permission Check
   |
   v
Application Use Case
   |
   v
Domain Invariant
```

Example permissions:

```text
invoice.create
invoice.pay
invoice.cancel
invoice.refund
```

Authorization is not a replacement for Domain invariants.

For example:

```text
User has invoice.pay permission
```

does not mean:

```text
A CLOSED Invoice can still be paid.
```

Permission and business validity are separate concerns.

---

# 13L. Standard Background Job / Scheduler Flow

Cron/queue/worker triggers are inbound adapters just like HTTP/Kafka.

Flow:

```text
Scheduler / Worker Trigger
      |
      v
Adapter
      |
      v
Application Use Case
      |
      v
Domain / Repository / Integration Port
```

Do not place large business logic directly inside:

```ts
@Cron(...)
```

or worker handlers.

This allows the same use case to be triggered by HTTP, scheduler, or message processing without duplicating business logic.

---

# 13M. API Implementation Decision Matrix

Agents should use the following matrix when choosing a flow:

```text
Use case only reads data?
    -> Read Query Flow

Use case changes state?
    -> Write Flow + consider UnitOfWork

Multiple DB writes must be atomic?
    -> UnitOfWork

Need to lock the same record?
    -> Repository business method such as findForUpdate()

Need another module to return a result immediately?
    -> Sync Port / Facade

Do not need another module to process immediately?
    -> Domain/Integration Event + Outbox

DB change + Kafka event?
    -> Transactional Outbox

External API?
    -> Integration Port + Adapter + resilience policy

Read-heavy/reporting?
    -> Query Object / optimized SQL

Redis cache?
    -> Cache-Aside + explicit invalidation/fallback

Kafka consumer?
    -> Inbox / idempotency + Application Use Case
```

---

# 13N. API Definition of Done

An API/use case is only complete when the agent confirms:

```text
[ ] Correct owning module.

[ ] Correct Read/Write classification.

[ ] Controller/consumer/scheduler acts only as an adapter.

[ ] Application use case is explicit.

[ ] Business invariants live in the correct Domain/Application layer.

[ ] Transaction boundary is explicit.

[ ] No EntityManager/DataSource/QueryRunner leakage.

[ ] Repository belongs to the owning module.

[ ] Cross-module interaction uses a public capability.

[ ] Sync/Event choice is justified.

[ ] DB + Kafka uses Outbox where consistency is required.

[ ] Consumer is idempotent if it processes messages.

[ ] External integration uses Port/Adapter.

[ ] Redis usage defines TTL/invalidation/failure behavior.

[ ] Error mapping respects boundaries.

[ ] ORM Entity is not returned directly by the API.

[ ] Request/correlation context is propagated when needed.

[ ] Appropriate tests exist for the layer/use case.

[ ] No unnecessary abstraction was introduced.
```

---


# 14. Unit of Work

The application-facing abstraction is:

```ts
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  transaction<T>(
    work: () => Promise<T>,
  ): Promise<T>;
}
```

Do not expose `EntityManager`.

Incorrect:

```ts
unitOfWork.transaction(async manager => {
  const repository =
    manager.getRepository(InvoiceOrmEntity);
});
```

Correct:

```ts
unitOfWork.transaction(async () => {
  await invoiceRepository.save(invoice);
});
```

---

# 15. Transaction Context

TypeORM requires transaction operations to use the transaction-scoped `EntityManager`.

The project propagates the active manager internally through `AsyncLocalStorage`.

Example:

```ts
@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage =
    new AsyncLocalStorage<EntityManager>();

  run<T>(
    manager: EntityManager,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(manager, work);
  }

  getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }
}
```

This class belongs to infrastructure only.

---

# 16. TypeORM Unit of Work

```ts
@Injectable()
export class TypeOrmUnitOfWork
  implements UnitOfWork {

  constructor(
    private readonly dataSource: DataSource,
    private readonly context:
      TypeOrmTransactionContext,
  ) {}

  async transaction<T>(
    work: () => Promise<T>,
  ): Promise<T> {
    if (this.context.isInTransaction()) {
      return work();
    }

    return this.dataSource.transaction(
      manager =>
        this.context.run(manager, work),
    );
  }
}
```

Default nested transaction semantics:

```text
Existing transaction -> join existing transaction
No transaction       -> create transaction
```

Do not create independent nested transactions unless explicitly required.

---

# 17. Transaction-Aware Repository Provider

```ts
@Injectable()
export class TypeOrmRepositoryProvider {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionContext:
      TypeOrmTransactionContext,
  ) {}

  getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    const manager =
      this.transactionContext.getManager();

    if (manager) {
      return manager.getRepository(entity);
    }

    return this.dataSource.getRepository(entity);
  }
}
```

Behavior:

```text
Outside transaction
    -> DataSource repository

Inside transaction
    -> transaction-scoped repository
```

---

# 18. Never Cache a Transaction-Aware Repository

Do not do this:

```ts
constructor(provider: TypeOrmRepositoryProvider) {
  this.repository =
    provider.getRepository(InvoiceOrmEntity);
}
```

The repository may be resolved outside a transaction.

Prefer:

```ts
private get repository() {
  return this.repositories.getRepository(
    InvoiceOrmEntity,
  );
}
```

or resolve inside each method.

---

# 19. Repository Ports

Repositories exposed to application/domain code are interfaces.

Example:

```ts
export const INVOICE_REPOSITORY =
  Symbol('INVOICE_REPOSITORY');

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;

  findForUpdate(
    id: string,
  ): Promise<Invoice>;

  save(
    invoice: Invoice,
  ): Promise<void>;
}
```

Use business-oriented names.

Prefer:

```text
findOpenInvoiceByRoom
findForUpdate
findActiveInvoice
```

over generic wrappers when business semantics exist.

Do not create repository abstractions that only mirror TypeORM CRUD without value.

---

# 20. TypeORM Repository Implementations

TypeORM repository implementations belong in module infrastructure.

Example:

```text
modules/invoice/infrastructure/persistence/typeorm/repositories/
typeorm-invoice.repository.ts
```

They may use:

- TypeORM Repository
- EntityManager
- QueryBuilder
- Raw SQL
- database-specific optimizations

These details must not leak into application/domain code.

---

# 21. Persistence Mappers

When domain and ORM entities are separated:

```text
Domain <-> Mapper <-> ORM Entity
```

Example:

```ts
export class InvoiceMapper {
  static toPersistence(
    invoice: Invoice,
  ): InvoiceOrmEntity {
    // ...
  }

  static toDomain(
    entity: InvoiceOrmEntity,
  ): Invoice {
    // ...
  }
}
```

Mapping logic belongs to persistence infrastructure.

---

# 22. Cross-Module ORM Relations

Avoid ORM object relations across business-module boundaries.

Avoid:

```ts
@ManyToOne(() => StoreOrmEntity)
store!: StoreOrmEntity;
```

inside Invoice if Store belongs to `StoreModule`.

Prefer:

```ts
@Column({
  name: 'StoreId',
  type: 'uuid',
})
storeId!: string;
```

Rule:

```text
Same module:
  ORM relation allowed.

Cross module:
  prefer scalar ID.
```

---

# 23. Database Foreign Keys

Avoiding ORM object relationships does not mean avoiding database integrity.

Foreign keys remain valid PostgreSQL integrity constraints even though ORM object relationships are avoided across modules.

Example:

```sql
ALTER TABLE "Invoices"
ADD CONSTRAINT "FK_Invoices_StoreId"
FOREIGN KEY ("StoreId")
REFERENCES "Stores"("Id");
```

Keep these concepts separate:

```text
Database integrity
!=
ORM object graph
!=
Business-module dependency
```

---

# 24. NestJS Module Registration

A module registers its owned ORM entities.

Example:

```ts
@Module({
  imports: [
    DatabaseModule,

    TypeOrmModule.forFeature([
      InvoiceOrmEntity,
      InvoiceItemOrmEntity,
      InvoicePaymentOrmEntity,
      InvoiceVatOrmEntity,
    ]),
  ],

  controllers: [
    InvoiceController,
  ],

  providers: [
    CreateInvoiceService,
    PayInvoiceService,

    TypeOrmInvoiceRepository,

    {
      provide: INVOICE_REPOSITORY,
      useExisting: TypeOrmInvoiceRepository,
    },
  ],
})
export class InvoiceModule {}
```

Use `autoLoadEntities: true` in the main TypeORM configuration.

---

# 25. TypeORM CLI Data Source

TypeORM CLI does not bootstrap the Nest module graph.

The standalone `data-source.ts` should discover ORM entities using globs.

Example:

```ts
export default new DataSource({
  // ...

  entities: [
    __dirname +
      '/../../modules/**/*.orm-entity{.ts,.js}',

    __dirname +
      '/../outbox/**/*.orm-entity{.ts,.js}',
  ],

  migrations: [
    __dirname +
      '/migrations/*{.ts,.js}',
  ],

  synchronize: false,
});
```

Do not move all entities into one global folder just for CLI convenience.

---

# 26. Cross-Module Communication

Repositories are private implementation details of their owning modules.

Forbidden:

```text
InvoiceModule -> MemberRepository
RoomModule    -> InvoiceRepository
Promotion     -> InvoiceOrmEntity
```

Preferred:

```text
InvoiceModule -> MemberFacade
InvoiceModule -> PromotionPort
InvoiceModule -> MemberQuery
InvoiceModule -> Domain/Application Event
```

Use:

- Public application services
- Facades
- Query ports
- Events

---

# 27. Module Public APIs

Nest module exports define the module public surface.

Avoid:

```ts
exports: [
  InvoiceOrmEntity,
  TypeOrmInvoiceRepository,
  INVOICE_REPOSITORY,
]
```

Prefer:

```ts
exports: [
  InvoiceFacade,
]
```

or export nothing if not needed.

---

# 27A. Cross-Module Transaction Contract

A synchronous call across module boundaries does not by itself require a shared write transaction. Prefer a public read/calculation capability when the caller needs an immediate answer.

When one business invariant truly requires writes in two modules to commit together in the **same database**, one application use case owns the transaction and calls the other module through its public application capability. Both sides must use the same UnitOfWork context and transaction-scoped repositories. The called module must not start an independent commit, expose its repository, or publish an integration event directly.

```text
Coordinating use case
  -> UnitOfWork.transaction()
     -> Module A public write capability
     -> Module B public write capability
     -> Outbox rows, if required
  -> one COMMIT or one ROLLBACK
```

The coordinating use case identifies the invariant and a stable lock order. Keep this transaction short; do not include slow network calls. Propagate a failure from a joined write so the entire operation rolls back. Do not catch a database failure and continue inside the same transaction; the UnitOfWork must roll back. Do not assume independent databases can share this ACID transaction. For cross-database or long-running work, model states, idempotency, and compensation explicitly.

Tests must prove that a failure in either module leaves neither module's write committed and that concurrent calls preserve the invariant. If the second action may happen later, use an event/outbox instead of a shared synchronous write.

---

# 28. CQRS-lite

The project uses CQRS selectively.

Do not introduce full CQRS complexity by default.

Separate write and read concerns where it provides value.

## Write Side

```text
Command
 -> Application Use Case
 -> Domain Aggregate
 -> Repository
 -> Transaction
```

## Read Side

```text
Query
 -> Read Repository / Query Object
 -> Optimized SQL
 -> Read DTO
```

Do not rebuild rich aggregates for simple list/search/report queries.

---

# 29. Reporting Architecture

Reporting is allowed to cross business data boundaries on the read side.

Example:

```text
ReportingModule
|
|-- DailySalesQuery
|-- RevenueByStoreQuery
|-- PaymentSummaryQuery
`-- ShiftPerformanceQuery
```

Reporting queries may join:

```text
Invoices
InvoiceItems
Members
Stores
Users
Shifts
Payments
```

Do not call multiple business services merely to build a report.

Write-side ownership must remain strict.

Read-side optimization may be pragmatic.

The reporting module owns the query contract, while each source module still owns its write schema and business meaning. Keep cross-module reporting queries read-only and make their table/view dependencies explicit. Review affected reports with every source migration; add contract or integration tests for relied-on columns and joins. A projection or stable read view may reduce direct coupling when schemas change often.

State freshness when reports use asynchronous projections or replicas. Do not use a possibly stale report to enforce a write-side invariant or authorization decision. Apply tenant/store access scope and sensitive-data rules to reporting results just as to ordinary reads.

---

# 30. Event Architecture

Distinguish:

1. Domain Event
2. Integration Event
3. Kafka Message

Example flow:

```text
Invoice Aggregate
      |
InvoicePaid
      |
      v
Application
      |
      v
Outbox
      |
      v
Integration Event
      |
      v
Kafka Adapter
      |
      v
Kafka
```

Domain events must not know Kafka topics or serialization details.

---

# 31. Event Envelope

Integration events should use consistent metadata.

Recommended shape:

```json
{
  "eventId": "uuid",
  "eventType": "invoice.paid.v1",
  "aggregateId": "uuid",
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "causationId": "uuid",
  "source": "<service-name>",
  "version": 1,
  "payload": {}
}
```

Event schemas must be versioned intentionally.

---

# 32. Transactional Outbox

Database writes and event persistence must be atomic.

Preferred:

```ts
return this.unitOfWork.transaction(async () => {
  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );
});
```

Runtime:

```text
BEGIN

INSERT/UPDATE Invoice
INSERT OutboxEvent

COMMIT
```

If either operation fails, both rollback.

---

# 33. Never Publish Kafka Inside a DB Transaction

Forbidden:

```ts
return this.unitOfWork.transaction(async () => {
  await invoiceRepository.save(invoice);

  await kafka.publish(event);
});
```

Kafka does not participate in the database transaction.

Use:

```text
Database Transaction
       |
Invoice + Outbox
       |
     COMMIT
       |
Outbox Publisher / CDC
       |
      Kafka
```

---

# 34. Outbox Publishing

Supported implementations:

## Worker Publisher

```text
Outbox Table
    |
    v
Outbox Worker
    |
    v
Kafka
```

## CDC

```text
Outbox Table
    |
PostgreSQL logical decoding or CDC, when enabled
    |
Debezium
    |
Kafka
```

Application code must not depend on which implementation is used.

For a worker publisher, multiple workers must claim rows without publishing the same claim concurrently. Use an atomic PostgreSQL claim and a short database transaction to acquire a lease, then commit the claim before broker I/O; keep locking details inside Infrastructure and verify concurrent workers against real PostgreSQL. Publish using the stable event ID, then mark the row delivered only after broker acknowledgement. A crash after publish but before that mark can produce a duplicate: the contract is **at least once**, and consumers must tolerate it. An expired lease must make the row retryable.

Define bounded retry/backoff, a parked or dead-letter state for poison records, and a controlled replay procedure. If order matters within an aggregate, assign a sequence or equivalent ordering key and preserve that order through claim and broker partitioning; do not promise global order. Observe pending count, oldest pending age, retries, parked records, and commit-to-publish latency. CDC deployments need equivalent recovery, duplicate, and observability guarantees.

---

# 35. Kafka Consumer Architecture

Kafka consumers are adapters.

Preferred:

```text
Kafka
 |
 v
Consumer Adapter
 |
Deserialize / Validate
 |
 v
Application Command / Use Case
```

Avoid consumers directly manipulating business persistence unless the consumer is explicitly designed as an ETL/synchronization adapter.

---

# 36. Idempotency / Inbox

Kafka consumers must be idempotent.

For a business effect stored in the same database as the inbox, claim the stable event ID under a unique constraint **inside the transaction that performs that effect**:

```text
Message
   |
   v
Validate envelope and payload
   |
UnitOfWork.transaction()
   -> atomically claim inbox(eventId) under a unique constraint
   -> duplicate: no business effect
   -> new: execute application use case using the same transaction
COMMIT
   -> ACK
```

If business work fails, the inbox claim rolls back with it. Concurrent duplicate deliveries must not both execute the effect. A crash after commit but before ACK causes redelivery, which the inbox ignores. Non-transactional external effects need their own idempotency key or a new outbox step; the inbox transaction alone cannot make them atomic.

Outbox protects producers.

Inbox/idempotency protects consumers.

---

# 37. Retry and DLQ

Consumer retry policy must distinguish:

```text
Transient technical failure
Business rejection
Invalid schema/message
Permanent dependency failure
```

Do not retry every failure indefinitely.

Kafka retry/DLQ behavior must be explicit and observable.

ACK only after the intended durable result (successful commit, confirmed duplicate, or durable quarantine according to policy). Invalid schemas and permanent business rejection require a documented discard/quarantine decision rather than an endless retry. Transient failures use bounded retries with backoff. Record enough metadata to diagnose and safely replay without silently changing the original event identity.

---

# 38. Redis Architecture

Redis is infrastructure.

Do not inject raw Redis clients into business/domain code.

Define purpose-specific abstractions.

Examples:

```text
CachePort
DistributedLockPort
RateLimitPort
SessionStore
```

Avoid a giant generic `RedisService` that becomes a dependency of every module.

---

# 39. Cache Strategy

Default caching strategy:

```text
Cache-Aside
```

Read:

```text
Application
    |
Cache lookup
    |
  miss
    |
Database
    |
Cache SET
```

Write:

```text
Database Update
      |
    COMMIT
      |
Cache Invalidate
```

Database remains the source of truth unless explicitly designed otherwise.

The post-commit cache action is **not atomic** with the DB write. A process crash or Redis failure can leave a stale value until TTL or repair; a concurrent miss may also refill an old value. Each cache must state its maximum acceptable staleness and how that bound is enforced. Options include a bounded TTL for tolerant reads, versioned keys/generation numbers for stronger read freshness, or outbox-driven invalidation for eventual repair with lag monitoring and a fallback when lag exceeds the allowed bound. An outbox alone does not guarantee immediate freshness. Critical invariants and authorization checks read an authoritative source.

After the DB commits, a cache failure cannot roll back that write. Do not return an ambiguous failure that invites an unsafe duplicate client retry unless the write API is idempotent and its error contract explains the outcome.

---

# 40. Redis Failure Strategy

For each Redis usage, define behavior when Redis is unavailable.

Examples:

```text
Non-critical cache:
  fallback to DB

Distributed lock:
  operation may need to fail

Rate limit:
  choose fail-open or fail-closed intentionally

Session:
  behavior depends on authentication design
```

Do not silently assume Redis is always available.

---

# 41. External Integrations

External systems must be accessed through ports.

Example:

```ts
export interface PaymentGateway {
  charge(
    request: ChargeRequest,
  ): Promise<ChargeResult>;
}
```

Infrastructure:

```text
integrations/payment/
|-- vnpay-payment.adapter.ts
`-- momo-payment.adapter.ts
```

Application depends on `PaymentGateway`, not Axios or a vendor SDK.

---

# 42. Resilience

External calls must define:

- Timeout
- Retry policy
- Backoff
- Circuit breaker policy
- Fallback behavior
- Idempotency requirements

Do not apply one retry policy globally.

Example:

```text
GET configuration:
  retries may be safe

Charge payment:
  automatic retry may be dangerous
  idempotency key required
```

---

# 43. HTTP / Presentation Architecture

Controllers should handle only:

- Routing
- Authentication
- Authorization
- Input validation
- DTO parsing
- Application use-case invocation
- Response mapping

Controllers must not contain:

- TypeORM queries
- Transactions
- Business calculations
- Kafka calls
- Redis implementation details

---

# 44. DTO Rules

DTOs are boundary contracts.

They are not domain entities.

Avoid:

```ts
dto.calculateTotal();
dto.applyPromotion();
```

DTOs may handle:

- transport validation
- serialization
- transformation

Business rules belong to domain/application logic.

---

# 45. API Response Rules

Do not return ORM entities directly.

Prefer:

```text
Domain/Application Result
        |
        v
Response Mapper
        |
        v
Response DTO
        |
        v
HTTP envelope
    data = Response DTO
    metadata only for a paginated API
    errorCode, message, status
```

The response DTO is `data`. It is not the HTTP body. The envelope is `{ data, errorCode, message, status }`, plus `metadata` only for a paginated API. See the [project profile](../docs/project-profile.md).

This prevents database schema changes from accidentally changing API contracts.

---

# 46. Error Architecture

Domain code should raise domain errors.

Example:

```ts
throw new InvoiceAlreadyPaidError();
```

Domain code should not throw:

```ts
BadRequestException
ConflictException
HttpException
```

HTTP mapping happens at the presentation boundary.

Example:

```text
InvoiceAlreadyPaidError
        |
        v
Exception Mapper
        |
        v
HTTP status + response envelope
```

Response body:

```json
{
  "data": null,
  "errorCode": "Invoice has already been paid",
  "message": "Invoice has already been paid",
  "status": false
}
```

`metadata` is omitted here because this response is not paginated. On success, `data` is the response DTO, `errorCode` is `null`, and `status` is `true`. A paginated success adds `metadata` beside `data` with `page`, `pageSize`, `total`, `lastPage`, and `next`. Do not nest `metadata` inside `data`.

`requestId` belongs to request context and logs (see §13J and §50). It is not a response field. The domain class name is not a response field. Full field rules are in the [project profile](../docs/project-profile.md).

---

# 47. Security Architecture

Separate:

```text
Authentication
Authorization
```

Authentication answers:

```text
Who is the caller?
```

Authorization answers:

```text
What is the caller allowed to do?
```

Prefer permissions/capabilities over scattered role checks.

Examples:

```text
invoice.create
invoice.cancel
invoice.refund
shift.close
promotion.update
```

Avoid:

```ts
if (user.role === 'ADMIN') {
  ...
}
```

throughout business code.

---

# 48. Configuration

Use typed configuration.

Recommended:

```text
config/
|-- app.config.ts
|-- database.config.ts
|-- redis.config.ts
|-- kafka.config.ts
|-- observability.config.ts
`-- config.validation.ts
```

Avoid direct `process.env.*` usage throughout the application.

Environment variables are parsed/validated at configuration boundaries.

---

# 49. Secrets

Production secrets must not be embedded in:

- source code
- committed `.env`
- Docker image
- configuration checked into Git

Use an external secret mechanism where available, such as Vault or the deployment platform's secret store.

---

# 50. Observability

Observability includes:

- Structured logging
- Metrics
- Distributed tracing
- Audit logging
- Correlation IDs

Recommended context fields:

```text
requestId
traceId
correlationId
userId
storeId
invoiceId
module
operation
duration
```

Do not rely on `console.log()` for production diagnostics.

---

# 51. Logging

Use structured logs.

Example:

```json
{
  "traceId": "...",
  "correlationId": "...",
  "storeId": "...",
  "invoiceId": "...",
  "module": "invoice",
  "operation": "payInvoice",
  "durationMs": 124
}
```

Never log secrets, credentials, tokens, or sensitive payment values.

---

# 52. Metrics

Technical metrics should include:

```text
HTTP request rate
HTTP latency
HTTP errors

DB pool utilization
DB query latency
DB errors

Redis latency
Redis hit/miss

Kafka producer errors
Kafka consumer lag
Kafka processing latency
```

Business metrics may include:

```text
invoice_created_total
invoice_paid_total
invoice_payment_failed_total
shift_closed_total
```

---

# 53. Tracing

Correlation/tracing context should propagate through:

```text
HTTP
Database
Kafka
Redis
External APIs
Workers
```

Outgoing events should carry correlation metadata where appropriate.

---

# 54. Background Workers

Long-running asynchronous work should not be forced into request/response flows.

Supported worker categories:

```text
Kafka consumers
Outbox publisher
Scheduled jobs
Reconciliation
Heavy background processing
```

Workers may live in the same repository but have separate runtime entry points.

---

# 55. Scheduler Rules

Cron/scheduled jobs should call application use cases.

Avoid putting business logic directly in cron decorators.

Preferred:

```text
Scheduler Adapter
      |
      v
Application Use Case
```

---

# 56. Locks

Locking mechanics belong to infrastructure.

Application may express intent:

```ts
invoiceRepository.findForUpdate(id);
```

Infrastructure may implement:

```text
PostgreSQL row lock via Infrastructure
pessimistic_write
```

Do not leak TypeORM lock syntax into domain logic.

---

# 57. Testing Architecture

Testing strategy:

```text
Domain
 -> Unit tests

Application
 -> Use-case tests

Repositories
 -> Integration tests with real PostgreSQL

Kafka / Redis
 -> Integration tests

HTTP
 -> E2E tests

Cross-system contracts
 -> Contract tests where valuable
```

Unit tests target complex or important behavior; they are not required for every source file. Store a unit test in `__tests__/` beside the tested source file's directory and name it `<subject>.unit.spec.ts`. Use integration tests to verify repository, broker, cache, and transaction behavior against real adapters where applicable.

---

# 58. Domain Tests

Domain tests should not require NestJS.

Example:

```ts
const invoice = Invoice.create(...);

invoice.pay(payment);

expect(invoice.status).toBe(
  InvoiceStatus.PAID,
);
```

These tests should remain fast.

---

# 59. Repository Tests

Do not mock TypeORM to prove a TypeORM repository works.

Repository implementations should be tested against a real PostgreSQL instance where practical.

Testcontainers or equivalent isolated integration environments are preferred.

---

# 60. Health Checks

Expose separate concepts for liveness and readiness.

Example:

```text
/live
  Is the process alive?

/ready
  Can this instance serve traffic?
```

These endpoints stay outside the application API prefix and response envelope. Keep their payloads operationally simple: `{ "status": "ok" }` when healthy and an HTTP 503 `{ "status": "error" }` when a critical readiness dependency is unavailable.

Readiness may consider critical dependencies.

Do not remove a healthy process from traffic merely because an optional dependency is temporarily unavailable.

Dependency criticality must be explicit.

---

# 61. Deployment Principles

The architecture is a Modular Monolith, but deployment may be horizontally scaled.

```text
Load Balancer
    |
+---+---+
|   |   |
v   v   v
API API API
```

Monolith does not mean single server.

The API should avoid machine-local mutable state.

---

# 62. Database HA

Application code connects to the database through the configured database endpoint/VIP/proxy.

Failover mechanics belong to infrastructure.

Application/domain code must not contain database failover awareness. pos-icool uses PostgreSQL; see the [project profile](../docs/project-profile.md).

---

# 63. Schema Evolution Strategy

pos-icool currently has no repository-owned schema migration program. Keep TypeORM `synchronize` disabled. Do not add a `migrations/` tree or TypeORM CLI data source during ordinary API work.

Before adopting schema migrations, approve and document:

1. Which team and deployable owns each schema.
2. The migration tool and source-of-truth directory.
3. Forward, rollback, and compatibility rules for rolling deployments.
4. Deployment ordering across application and schema changes.
5. Real PostgreSQL integration tests for constraints, mapping, locks, and concurrent behavior.
6. Backup, restore, observability, and operator runbooks.

Until that decision is adopted, schema changes are an external operational dependency and must be called out explicitly in the task and release notes.

---


# 63A. Execution Flow Priority Rule

When implementing APIs, the flows defined in sections `13A` through `13N` are normative.

If the framework allows a shorter implementation but that implementation breaks the defined flow or boundaries, do not choose the shortcut.

For example, NestJS supports:

```ts
constructor(
  @InjectRepository(InvoiceOrmEntity)
  private readonly invoices: Repository<InvoiceOrmEntity>,
) {}
```

Using this in a Controller/Service does not mean the architecture allows this pattern in every layer.

Framework capability is not an Architecture Decision.


# 64. Architecture Rules for Agents

All coding agents MUST treat this file as the architectural contract.

Before changing code, determine:

1. Which business module owns the behavior?
2. Is this write-side or read-side logic?
3. Does this operation require a transaction?
4. Does it cross a module boundary?
5. Is an infrastructure dependency leaking into application/domain code?
6. Is an event internal or an integration event?
7. Does the operation require idempotency?
8. Does Redis/Kafka/external API failure require explicit fallback behavior?
9. Is new abstraction justified by real complexity?

---

# 65. MUST

Agents MUST:

- Keep business logic inside business modules.
- Keep TypeORM inside infrastructure/persistence.
- Keep Redis implementation details inside cache infrastructure.
- Keep Kafka implementation details inside messaging infrastructure.
- Use UnitOfWork for multi-step atomic database operations.
- Keep `EntityManager` hidden from application/domain code.
- Resolve TypeORM repositories through transaction-aware infrastructure.
- Place ORM entities inside the module that owns them.
- Use repository ports for aggregate persistence.
- Keep repositories private to their owning module.
- Use module facade/port/event for cross-module communication.
- Use Transactional Outbox for reliable DB + Kafka workflows.
- Make Kafka consumers idempotent.
- Separate optimized read queries from aggregate repositories when useful.
- Keep reporting reads free to use optimized cross-module joins.
- Keep controllers thin.
- Keep domain errors transport-independent.
- Use explicit resilience policies for external calls.
- Use structured logs and observable failures.
- Preserve module boundaries when adding new features.
- Prefer simple architecture when a module is only CRUD.

---

# 66. MUST NOT

Agents MUST NOT:

- Call `DataSource.transaction()` from application services.
- Pass `EntityManager` through application/business methods.
- Call `manager.getRepository()` in application code.
- Inject raw TypeORM repositories into domain code.
- Inject another module's repository.
- Access another module's ORM entity directly.
- Create one Nest module per database table.
- Keep all entities in a global `database/entities` directory.
- Publish Kafka directly inside a database transaction.
- Use Redis as an undeclared source of truth.
- Add retries blindly to non-idempotent external operations.
- Put domain-specific helpers into global `common`.
- Return ORM entities directly from controllers.
- Throw HTTP exceptions from domain entities.
- Introduce full DDD/CQRS ceremony into trivial CRUD without justification.
- Create cross-module TypeORM object graphs by default.
- Cache a repository resolved from a transaction-aware provider.
- Hide important transactional boundaries so completely that use-case atomicity becomes unclear.
- Couple business logic to deployment or HA mechanics.

---

# 67. Decision Guide: New Module

Before creating a module, ask:

```text
Does this represent a business capability?

Does it own a distinct business lifecycle?

Does it expose meaningful behavior?

Would another module interact with it through a public capability?
```

If not, the code may belong to an existing module.

---

# 68. Decision Guide: New Repository

Before creating a repository, ask:

```text
Is this an aggregate persistence abstraction?

Does the application need this persistence capability?

Does the method express business persistence semantics?

Or is this only wrapping TypeORM CRUD?
```

Do not add abstraction without value. Name a write or cohesive small read/write port `Repository`; name a read-only port `ReadRepository` or a specific `Query`. The TypeORM adapter mirrors that responsibility. See [conventions §§17–19](./conventions.md#17-repository-port-naming) for file, class, and token names; a name alone does not justify splitting one cohesive adapter into multiple layers.

---

# 69. Decision Guide: Domain Model

Before introducing Domain Entity + ORM Entity separation, ask:

```text
Does this concept have meaningful behavior?

Does it enforce invariants?

Does persistence shape differ from business shape?

Is the business complexity high enough to justify mapping?
```

If not, a simpler CRUD model is acceptable.

---

# 70. Decision Guide: Transaction

Before opening a transaction, identify the invariant being protected.

Example:

```text
Invoice status change
+
Payment record
+
Outbox event
```

may need to commit atomically.

Do not wrap large unrelated workflows in one database transaction.

Keep transactions short.

---

# 71. Decision Guide: Sync vs Event

Use synchronous communication when:

```text
The caller needs an immediate answer to continue.
```

Use events when:

```text
The producer does not require an immediate consumer result.
Consumers may be added independently.
Eventual consistency is acceptable.
```

Do not use Kafka merely because Kafka exists.

---

# 72. Decision Guide: Cache

Before adding cache, define:

```text
What is cached?
Why is it cached?
What is the source of truth?
What is the TTL?
How is it invalidated?
What happens if Redis is unavailable?
```

If these questions are not answered, do not add the cache.

---

# 73. Architecture Mental Model

```text
                 BUSINESS MODULES

+------------------------------------------+
| Invoice                                  |
|                                          |
| Presentation                             |
|      |                                   |
|      v                                   |
| Application                              |
|      |                                   |
|      v                                   |
| Domain / Ports                           |
|      ^                                   |
|      |                                   |
| Infrastructure / TypeORM                 |
+------------------------------------------+

+------------------------------------------+
| Promotion                                |
| Member                                   |
| Loyalty                                  |
| Room                                     |
| Shift                                    |
| Store                                    |
| Reporting                                |
+------------------------------------------+


              SHARED INFRASTRUCTURE

+------------------------------------------+
| Database                                 |
| - UnitOfWork implementation              |
| - TransactionContext                     |
| - RepositoryProvider                     |
| - Migrations                             |
|                                          |
| Kafka                                    |
| Redis                                    |
| Outbox                                   |
| Security                                 |
| Observability                            |
| Integrations                             |
| Resilience                               |
+------------------------------------------+
```

The core rule is:

> Business modules own business concepts. Infrastructure owns technical mechanisms.

Application code defines:

```text
WHAT must happen.
```

Domain code defines:

```text
WHAT is valid.
```

Infrastructure defines:

```text
HOW technical work is performed.
```

Presentation defines:

```text
HOW the outside world communicates with the application.
```

---

# 74. Preferred End-State Example

Application code should remain readable:

```ts
return this.unitOfWork.transaction(async () => {
  const invoice =
    await this.invoiceRepository.findForUpdate(
      command.invoiceId,
    );

  invoice.pay(command.payment);

  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );

  return InvoiceResult.from(invoice);
});
```

This code should not need to know that the runtime implementation involves:

```text
TypeORM
EntityManager
PostgreSQL
Invoice tables
Payment tables
Outbox table
Kafka
Redis
HAProxy
database failover
```

Those concerns belong behind the architectural boundaries defined in this document.

---

# 75. Final Principle

Do not optimize for the largest possible architecture.

Optimize for:

```text
Clear ownership
Explicit boundaries
Business readability
Correct transactions
Controlled coupling
Operational reliability
Future evolvability
```

Use the simplest implementation that still respects these boundaries.

<!-- Final English architecture contract: original English architecture preserved, API execution flows added as normative rules. -->
