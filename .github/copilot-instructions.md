# GitHub Copilot Instructions for WP Kernel

## Project Overview

WP Kernel is a Rails-like, opinionated framework for building modern WordPress products where JavaScript is the source of truth and PHP is a thin contract (REST + capabilities + optional server bindings).

**Core Philosophy**: Actions-first, JS hooks canonical, blocks + bindings + interactivity for views, resources for transport, jobs for background work, and a single PHP bridge for structured legacy extensibility.

---

## Quick Links to Documentation

- **[Product Specification](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md)** - Complete framework spec, API contracts, guarantees
- **[Code Primitives & Dev Tooling](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md)** - Error model, logging, network strategy, testing
- **[Sprint 0 — Environment & Tooling](../information/Sprint%200%20%E2%80%94%20Environment%20%26%20Tooling.md)** - Setup, configs, seed scripts
- **[Event Taxonomy Reference](../information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)** - All events, payloads, bridge mapping
- **[Foreword](../information/Foreword.md)** - Why this exists, mental model, day-one story

---

## Golden Path Patterns (The "Way" to Do Things)

### 1. **Actions-First Rule** (enforced by lint + runtime)

UI components NEVER call transport directly. Always route writes through Actions.

```typescript
// ❌ WRONG - UI calling resource directly
const handleSubmit = async () => {
	await thing.create(formData); // Lint error + runtime warning
};

// ✅ CORRECT - UI calls Action
import { CreateThing } from '@/app/actions/Thing/Create';
const handleSubmit = async () => {
	await CreateThing({ data: formData });
};
```

**Why**: Actions orchestrate writes, emit events, invalidate caches, and queue jobs. Direct transport calls bypass this.

**Reference**: [Product Spec § 4.3 Actions](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#43-actions-write-path-orchestration)

---

### 2. **Resource Definition Pattern**

Resources define typed REST contracts. One definition → client + store + cache keys + events.

```typescript
// packages/kernel/src/resource/defineResource.ts pattern
import { defineResource } from '@geekist/wp-kernel/resource';

export const thing = defineResource<Thing, { q?: string; cursor?: Cursor }>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
		update: { path: '/wpk/v1/things/:id', method: 'PUT' },
		remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q, q?.cursor],
		get: (id) => ['thing', 'get', id],
	},
});
```

**Reference**: [Product Spec § 4.1 Resources](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#41-resources-model--client)

---

### 3. **Event Emission Pattern**

Use canonical events from the registry. Never create ad-hoc event names.

```typescript
// In an Action
import { events } from '@geekist/wp-kernel/events';

export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	const created = await thing.create(data);

	// ✅ Use canonical event
	CreateThing.emit(events.thing.created, { id: created.id, data });

	invalidate(['thing', 'list']);
	return created;
});
```

**See full event taxonomy**: [Event Reference Card](../information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)

**Reference**: [Product Spec § 4.6 Events](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#46-hooks--events-canonical-taxonomy)

---

### 4. **Error Handling Pattern**

All errors are KernelErrors (typed, structured, serializable).

```typescript
// Throwing a KernelError
throw new KernelError('PolicyDenied', {
	policyKey: 'things.manage',
	context: { userId: currentUser.id },
});

// Catching and handling
try {
	await CreateThing({ data });
} catch (e) {
	if (e.code === 'PolicyDenied') {
		showNotice(__('Permission denied'), 'error');
	} else {
		reporter.error(e); // Logs + emits event
	}
}
```

**Error taxonomy**: TransportError, ServerError, PolicyDenied, ValidationError, TimeoutError, DeveloperError, DeprecatedError

**Reference**: [Code Primitives § 2 Error Model](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md#2-error-model-kernelerrors)

---

### 5. **Block Bindings Pattern**

Bind core blocks to store data. No custom blocks needed for read paths.

```typescript
// Client-side binding
import { registerBindingSource } from '@geekist/wp-kernel/bindings';
import { select } from '@wordpress/data';

registerBindingSource('gk', {
  'thing.title': (attrs) => select('wpk/thing').getById(attrs.id)?.title,
  'thing.price': (attrs) => select('wpk/thing').getById(attrs.id)?.price
});

// In block.json
{
  "bindings": {
    "core/heading": { "content": "gk:thing.title" },
    "core/paragraph": { "content": "gk:thing.price" }
  }
}
```

**For SEO (server bindings)**: [Product Spec § 4.4.1.1 Server Binding Sources](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#4411-server-binding-sources-ssr-for-seo)

---

### 6. **Interactivity API Pattern**

Front-end behavior without jQuery or custom React components.

```typescript
import { defineInteraction } from '@geekist/wp-kernel/interactivity';

export const useThingForm = defineInteraction('wpk/thing-form', {
	state: () => ({ saving: false, error: null }),
	actions: {
		async submit(formData) {
			this.state.saving = true;
			try {
				await CreateThing({ data: formData });
			} catch (e) {
				this.state.error = e.message;
			} finally {
				this.state.saving = false;
			}
		},
	},
});
```

**Reference**: [Product Spec § 4.4.2 Interactivity](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#442-interactivity-front-end-actions)

---

### 7. **Job Definition Pattern**

Background work with polling support.

```typescript
import { defineJob } from '@geekist/wp-kernel/jobs';

export const IndexThing = defineJob('IndexThing', {
	enqueue: (params: { id: number }) => {
		// POST /wpk/v1/jobs/index-thing
	},
	status: (params) => {
		// GET /wpk/v1/jobs/index-thing/status?id=...
	},
});

// Usage
await jobs.enqueue('IndexThing', { id: 123 });
await jobs.wait(
	'IndexThing',
	{ id: 123 },
	{
		pollInterval: 1500,
		pollTimeout: 60000,
	}
);
```

**Reference**: [Product Spec § 4.5 Jobs](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#45-jobs-background-work)

---

## Folder Structure Conventions

```
app/
  resources/     # defineResource() definitions
  policies/      # definePolicy() maps
  actions/       # defineAction() orchestrators
    Thing/
      Create.ts
      Update.ts
      Delete.ts
  views/         # Block bindings + Interactivity
  jobs/          # defineJob() definitions
  extensions/    # SlotFill + hook listeners
```

**Never** deep-import across packages: `packages/*/src/**` is forbidden by lint.

---

## Network & Retry Strategy

**Automatic retry** with exponential backoff:

- Network timeout / 408 / 429 / 5xx: Retry with backoff (see config)
- 4xx (except 408, 429): Fail immediately
- Default: 3 attempts, 1s → 2s → 4s backoff

**Timeouts**:

- Request: 30s
- Total (with retries): 60s
- Job polling: 60s (configurable)

**Full details**: [Code Primitives § 5.1 Transport](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md#51-transport)

---

## Testing Strategy

### Unit Tests

- Jest with `@wordpress/jest-preset-default`
- Test Actions, Policies, Resources in isolation
- Mock transport layer

### E2E Tests

- Playwright with `@wordpress/e2e-test-utils-playwright`
- Target `wp-env` tests site (localhost:8889)
- Use seed scripts for consistent fixtures

**Seed data**: `pnpm wp:seed` (users, jobs, applications)

**Reference**: [Sprint 0 § Testing](../information/Sprint%200%20%E2%80%94%20Environment%20%26%20Tooling.md#-seed-data-test-fixtures-)

---

## Common Tasks

### Add a New Resource

1. Create `app/resources/{ResourceName}.ts` using `defineResource` pattern
2. Create JSON Schema in `contracts/{resource}.schema.json`
3. Generate TypeScript types: `pnpm types:generate`
4. Add REST endpoint in PHP with versioned route
5. Write unit test for client methods

### Add a New Action

1. Create `app/actions/{Domain}/{ActionName}.ts`
2. Use `defineAction(name, handler)`
3. Emit canonical events (check registry)
4. Call `invalidate()` for affected cache keys
5. Queue jobs with `jobs.enqueue()` if needed
6. Write unit test with mocked transport

### Add a Block Binding

1. Register source in `app/views/bindings.ts`
2. Use `select()` from `@wordpress/data` to read store
3. Add to `block.json` bindings object
4. (Optional) Add server binding in PHP for SEO

### Add Custom Event

1. Check if canonical event exists first (see registry)
2. If truly custom, follow pattern: `wpk.{domain}.{action}`
3. Document payload contract
4. Decide if it should bridge to PHP (update docs)

---

## Build & Dev Commands

```bash
pnpm i              # Install dependencies
pnpm dev            # Watch mode (all packages)
pnpm build          # Production build
pnpm test           # Unit tests
pnpm e2e            # E2E tests (requires wp-env)
pnpm lint           # ESLint + format check
pnpm wp:start       # Start WordPress (dev:8888, tests:8889)
pnpm wp:seed        # Seed test data
pnpm wp:fresh       # Start + seed
pnpm playground     # Launch Playground (WASM)
```

---

## Code Style & Conventions

- **ESLint**: Extends `@wordpress/eslint-plugin`
- **TypeScript**: Strict mode, declare all types
- **Imports**: Use path aliases (`@kernel/*`, `@ui/*`)
- **Exports**: One public entry per package (`exports` in package.json)
- **Event names**: Always use `events` registry (never strings)
- **Error types**: Always throw/return `KernelError` subclass
- **Action naming**: `{Domain}.{Verb}` (e.g., `Thing.Create`)

---

## Versioning & Deprecation

- **SemVer**: MAJOR.MINOR.PATCH
- **MAJOR**: Breaking API, event taxonomy, or slot changes
- **MINOR**: New events/slots/helpers (non-breaking)
- **PATCH**: Fixes only
- **Deprecation**: Use `@wordpress/deprecated`, emit `wpk.deprecated`, remove in next major

**Process**: [Code Primitives § 6 Deprecation](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md#6-deprecation--feature-flags)

---

## Key Guarantees to Remember

1. **Actions-first**: UI never writes directly to transport (enforced)
2. **JS hooks canonical**: PHP bridge mirrors selected events only
3. **Type safety**: Resources generate types from JSON Schema
4. **Event stability**: Names frozen in major versions
5. **Performance budgets**: TTI < 1500ms, added JS < 30KB gz
6. **Retry strategy**: Automatic with exponential backoff
7. **Error structure**: All errors are typed KernelErrors
8. **Cache lifecycle**: Explicit invalidation, no magic

---

## When to Check Documentation

- **Creating a resource?** → [Product Spec § 4.1](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#41-resources-model--client)
- **Writing an action?** → [Product Spec § 4.3](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#43-actions-write-path-orchestration)
- **Need an event?** → [Event Reference](../information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)
- **Server binding?** → [Product Spec § 4.4.1.1](../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md#4411-server-binding-sources-ssr-for-seo)
- **Error handling?** → [Code Primitives § 2](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md#2-error-model-kernelerrors)
- **Retry behavior?** → [Code Primitives § 5.1](../information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20%E2%80%A2%20v1.0.md#51-transport)
- **Setting up environment?** → [Sprint 0](../information/Sprint%200%20%E2%80%94%20Environment%20%26%20Tooling.md)

---

## What NOT to Do

❌ Call transport from UI components  
❌ Create ad-hoc event names  
❌ Deep-import across packages (`packages/*/src/**`)  
❌ Throw plain Error objects (use KernelError)  
❌ Enqueue script globals (use Script Modules only)  
❌ Mutate event payloads  
❌ Long-running sync operations in PHP bridge (< 100ms budget)  
❌ Include PII in event payloads  
❌ Skip cache invalidation after writes  
❌ Ignore TypeScript errors

---

## Questions or Stuck?

1. Check relevant doc section (links above)
2. Search event registry for existing patterns
3. Look at `examples/showcase-plugin` for working code
4. Review test files for usage examples

---

**Last Updated**: 30 September 2025  
**Current Sprint**: Sprint 0 (Environment & Tooling)  
**Node Version**: 22.20.0 LTS  
**PHP Version**: 8.3+
