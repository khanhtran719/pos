# Reusable architecture quality gates

The adopting repository uses `.architecture-checks.json` to declare its source/module roots and any temporary legacy test inventory. `.architecture-boundary-baseline.json`, when present, records current import violations. The gate rejects new violations and stale baseline entries. Reduce a baseline whenever an import is fixed; do not broaden public prefixes to hide private imports.

Copy this directory to `quality-gates/` beside `AGENTS.md`, `.ai/`, and `src/` in a NestJS modular monolith repository.

Run `bash quality-gates/ci-check.sh` locally or as a CI step. The script installs its pinned TypeScript dependency, tests the validators, then checks the adopting repository's docs, imports, and unit-test layout. If the project's `tsconfig.json` extends an installed package, install the project's dependencies first.

To change folder names or public import paths, copy `architecture-checks.example.json` to the repository root as `.architecture-checks.json` and edit it. Without that file, the checker assumes `src/modules/<module>/{domain,application,infrastructure,presentation}` and `src/shared/{domain,application,infrastructure}`. Cross-module imports are allowed only through a module root `index.ts`, its Nest module file, `public/`, or the configured facade/port/query paths. A public `index.ts` may not re-export repositories or infrastructure. List existing old `*.spec.ts` files under `legacyUnitTests` only during migration; new legacy names fail, and removed entries must be deleted from the inventory.

## What fails CI

- Missing required standard files, broken relative Markdown links/anchors, unbalanced code fences, missing rule IDs or referenced architecture/workflow sections.
- Domain imports of framework, ORM, cache, broker, or HTTP packages; Application imports of concrete TypeORM/Redis/Kafka/HTTP clients; inward layer-direction violations; private cross-module imports; shared code depending on a business module; private persistence re-exported through a public barrel.
- A `*.unit.spec.ts` file outside an immediate `__tests__/` directory or without a matching `.ts` or `.tsx` source file beside that directory. An unnamed `*.spec.ts` file not in `legacyUnitTests`, or a stale inventory entry, also fails. The checker does not require a unit test for every source file.
- No source files found under the configured source root. This avoids a false green check before the project is wired.

The import checker uses the TypeScript parser and `tsconfig.json` resolution, including path aliases, type-only imports, static exports, literal `require()`, and literal dynamic `import()`. It cannot prove runtime behavior, NestJS provider exports, reflective/dynamic import paths, SQL constraints, or transaction correctness. Use the companion operational contract scenarios for those checks.

The optional `.architecture-boundary-baseline.json` stores normalized current findings without line numbers. With it, CI fails on any new or stale finding; without it, CI requires zero violations. Known baseline entries are a migration queue, not approved architecture exceptions. `NO_SOURCE_FILES` always fails. Do not regenerate the baseline after a code change merely to bypass a new violation.

When adopting the unit-test naming convention, migrate existing unit tests to `*.unit.spec.ts` and check that the project's test runner includes the new pattern. Integration and E2E test placement remains project-specific.

If a project intentionally allows a different public surface or package, update its local config and document the reason. Do not disable a rule merely to make CI green.
