# @wpkernel/create-wpk

## Unreleased

### Added

- Initial workspace scaffolding for the `npm|pnpm|yarn create @wpkernel/wpk` bootstrap entry point (Task 37).
- Bootstrap proxy that forwards positional arguments and `--`-delimited flags into `wpk create` (Task 38 installment 1).
- Telemetry instrumentation and integration smoke coverage for the published bootstrap binary to confirm flags like `--skip-install` reach `wpk create` (Task 38 installment 2).
