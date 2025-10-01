# API Reference

Complete API documentation for WP Kernel.

## Core Modules

### [Resources](/api/resources)

Define typed REST resources with automatic client generation, store integration, and cache management.

### [Errors](/api/generated/errors/README)

Structured error handling with typed error classes.

### [Transport](/api/generated/transport/README)

HTTP transport layer wrapping @wordpress/api-fetch.

## Coming Soon

The following modules are planned for future sprints:

- [**Actions**](/api/actions) - Write operation orchestration (Sprint 3)
- [**Jobs**](/api/jobs) - Background task management (Sprint 2)
- [**Events**](/api/events) - Hook system integration (Sprint 2)

## Usage

```typescript
import { defineResource, invalidate } from '@geekist/wp-kernel';
import { KernelError, ServerError } from '@geekist/wp-kernel/errors';
import { fetch } from '@geekist/wp-kernel/transport';
```

For detailed examples and tutorials, see the [Guide](/guide/).
