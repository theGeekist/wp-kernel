# @wpkernel/wp-json-ast

## Unreleased

### In progress

- **Phase 7 – Plugin bootstrap flow** – Tasks 37-45 cover the create bootstrap, plugin loader, regeneration cleanup, and activation smoke on the path to 0.11.0; no JSON AST changes are expected unless the bootstrap work uncovers schema gaps.
- **Phase 8 placeholder** – Task 46 will collect incremental diagnostics (starting with the CLI LogLayer reporter) after the bootstrap flow ships.

## 0.10.0 - 2025-11-05

### Maintenance

- Version bump to `0.10.0` to align with the Phase 6 core pipeline release; WordPress JSON AST helpers remain unchanged.

## 0.9.0 - 2025-10-27

### Maintenance

- Version bump to `0.9.0` to stay aligned with the Phase 5 release; helpers remain
  unchanged.

## 0.8.0 - 2025-10-26

### Maintenance

- Version bump to `0.8.0` with the command migration release to keep schema
  helpers synced with the CLI pipeline.

## 0.7.0 - 2025-10-26

### Maintenance

- Version bump to `0.7.0` to match the block builder parity release while the
  package surface stayed stable.

## 0.6.0 - 2025-10-26

### Maintenance

- Version bump to `0.6.0` aligned with the transient storage parity release.

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` aligned with the wp-option parity release.

## 0.4.0

### Added

- Initial WordPress-specific JSON AST bridge built on top of `@wpkernel/php-json-ast`
  for the CLI pipeline.
