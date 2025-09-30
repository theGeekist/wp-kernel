# API Reference

> **Status**: 🚧 This section will be populated in Sprint 1+ with auto-generated API documentation

WP Kernel API documentation will be generated from TypeScript source code using TypeDoc or API Extractor.

## Available APIs

### Core Package (`@geekist/wp-kernel`)

- [Resources](/api/resources) - REST client + store + cache
- [Actions](/api/actions) - Write orchestration
- [Events](/api/events) - Canonical event taxonomy
- Jobs - Background work (coming soon)
- Policies - Permission checks (coming soon)

### UI Package (`@geekist/wp-kernel-ui`)

- Components - React components (coming soon)
- Bindings - Block binding sources (coming soon)
- Interactivity - Front-end behavior (coming soon)

### E2E Utils (`@geekist/wp-kernel-e2e-utils`)

- Test Helpers - Playwright utilities (coming soon)
- Fixtures - Test data management (coming soon)

## Type Definitions

All types are exported from package entry points:

```typescript
import type { Resource, Action, Event } from '@geekist/wp-kernel';
import type { Component } from '@geekist/wp-kernel-ui';
```

## Contributing

To generate API documentation locally:

```bash
pnpm docs:api
```

(This command will be added in Sprint 1)
