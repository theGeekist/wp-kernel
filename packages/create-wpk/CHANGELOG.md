# @wpkernel/create-wpk

## Unreleased

### Added

- Initial workspace scaffolding for the `npm|pnpm|yarn create @wpkernel/wpk` bootstrap entry point (Task 37).
- Bootstrap proxy that forwards positional arguments and `--`-delimited flags into `wpk create` (Task 38 installment 1).
- Telemetry instrumentation and integration smoke coverage for the published bootstrap binary to confirm flags like `--skip-install` reach `wpk create` (Task 38 installment 2).

## 0.10.0 - 2025-11-05

### Maintenance

- Version bump to `0.10.0` alongside the Phase 6 core pipeline release; no additional bootstrap changes landed in this cycle.
