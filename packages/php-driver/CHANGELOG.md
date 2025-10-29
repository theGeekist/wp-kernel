# @wpkernel/php-driver

## Unreleased

### In progress

- **Phase 6 – Core pipeline alignment** – Tracking Tasks 32-36 for any installer
  or runtime updates required by the core orchestration work.
- **Phase 7 – Plugin bootstrap flow** – Tasks 37-45 will deliver the create bootstrap, plugin loader, regeneration cleanup, and activation smoke; no driver updates are expected unless the bootstrap flow surfaces installer changes.
- **Phase 8 placeholder** – Task 46 will collect incremental diagnostics (LogLayer reporter, transcript polish) after the bootstrap flow ships.

## 0.9.0 - 2025-10-27

### Maintenance

- Version bump to `0.9.0` to match the Phase 5 release; the PHP driver and
  installer remain unchanged.

## 0.8.0 - 2025-10-26

### Maintenance

- Version bump to `0.8.0` alongside the command migration release so CLI
  pipelines continue to consume the aligned driver version.

## 0.7.0 - 2025-10-26

### Maintenance

- Version bump to `0.7.0` to stay in lockstep with the block builder parity
  release; no driver updates were required.

## 0.6.0 - 2025-10-26

### Maintenance

- Version bump to `0.6.0` as part of the transient storage parity release to
  keep the driver aligned with the pipeline.

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` matching the wp-option parity release cadence.

## 0.4.0

### Added

- Initial driver release with PHP bridge installer and execution helpers for the
  next-generation CLI pipeline.
