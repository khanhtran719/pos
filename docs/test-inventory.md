# Test inventory

pos-icool has no grandfathered legacy unit-test names or architecture-boundary violations.

New unit tests use `*.unit.spec.ts` inside a sibling `__tests__/` directory. Integration tests use `*.integration.spec.ts`; application E2E tests use the repository's explicit E2E convention. Do not add a legacy entry merely to make the quality gate pass.
