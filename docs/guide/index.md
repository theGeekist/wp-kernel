# Core Concepts

WP Kernel is built around a few key primitives that work together to give you a complete application framework.

## The Architecture

```
┌─────────────────────────────────────────────────┐
│                    User                         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│        View (Blocks + Bindings + Interactivity) │
│  • Block Bindings (read data)                   │
│  • Interactivity API (front-end behavior)       │
│  • Components (editor UI)                       │
└────────────────────┬────────────────────────────┘
                     │
                     │ triggers
                     ▼
┌─────────────────────────────────────────────────┐
│               Action (orchestration)            │
│  • Validates permissions                        │
│  • Calls Resources                              │
│  • Emits Events                                 │
│  • Invalidates cache                            │
│  • Enqueues Jobs                                │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
    │Resource│  │ Events │  │ Cache  │  │  Jobs  │
    │(REST)  │  │(hooks) │  │(store) │  │(queue) │
    └────┬───┘  └───┬────┘  └───┬────┘  └───┬────┘
         │          │           │           │
         ▼          ▼           ▼           ▼
    ┌──────────────────────────────────────────┐
    │          WordPress (REST + DB)           │
    └──────────────────────────────────────────┘
```

## The Five Primitives

### 1. Resources

**What**: Typed REST client + store + cache keys from one definition

**When**: Every time you need to read/write data from WordPress

[Learn more →](/guide/resources)

### 2. Actions

**What**: Orchestration layer that coordinates writes, events, cache, jobs

**When**: Every time UI needs to modify data (enforced rule)

[Learn more →](/guide/actions)

### 3. Events

**What**: Canonical event taxonomy with stable names (`wpk.{domain}.{action}`)

**When**: After every write, for extensibility and debugging

[Learn more →](/guide/events)

### 4. Block Bindings

**What**: Connect core WordPress blocks to your store data

**When**: Displaying content in editor or on front-end (read path)

[Learn more →](/guide/block-bindings)

### 5. Interactivity API

**What**: Add front-end behavior to blocks without custom JavaScript

**When**: User interactions on the front-end (forms, toggles, etc.)

[Learn more →](/guide/interactivity)

### Bonus: Jobs

**What**: Background work with polling support

**When**: Long-running tasks (imports, exports, processing)

[Learn more →](/guide/jobs)

## The Golden Rules

### 1. Actions-First (Enforced)

UI components NEVER call transport directly. Always route through Actions.

```typescript
// ❌ WRONG
const handleSubmit = async () => {
  await thing.create(formData); // ESLint error + runtime warning
};

// ✅ CORRECT
const handleSubmit = async () => {
  await CreateThing({ data: formData });
};
```

### 2. Read Path vs Write Path

**Read**: View → Bindings → Store selectors → Resource (cached)

**Write**: View → Action → Resource → Events + Invalidation → Re-render

### 3. Event Stability

Event names are frozen in major versions. Use the canonical registry:

```typescript
import { events } from '@geekist/wp-kernel/events';

// ✅ Use canonical events
CreateThing.emit(events.thing.created, { id });

// ❌ Never use ad-hoc strings
CreateThing.emit('thing:created', { id }); // Lint error
```

### 4. JS Hooks Are Canonical

JavaScript hooks are the source of truth. PHP bridge mirrors selected events only.

### 5. Explicit Cache Lifecycle

No magic. You control when caches invalidate:

```typescript
invalidate(['thing', 'list']); // Explicit
```

## Data Flow Example

Let's trace a "Create Thing" request:

1. **User clicks Submit** → Component calls `CreateThing({ data })`
2. **Action validates** → Checks permissions (optional)
3. **Action calls Resource** → `thing.create(data)` → POST to REST
4. **WordPress validates** → Schema, capabilities, sanitization
5. **Resource returns** → Action receives created object
6. **Action emits event** → `wpk.thing.created` (canonical)
7. **Action invalidates cache** → `['thing', 'list']` marked stale
8. **Action returns** → Component receives result
9. **Store refetches** → List query re-runs, gets fresh data
10. **UI updates** → New item appears in list

## Error Handling

All errors are `KernelError` (typed, structured, serializable):

```typescript
try {
  await CreateThing({ data });
} catch (e) {
  if (e.code === 'PolicyDenied') {
    showNotice(__('Permission denied'), 'error');
  } else if (e.code === 'ValidationError') {
    showNotice(__('Invalid data'), 'error');
  } else {
    reporter.error(e); // Logs + emits event
  }
}
```

Error types: `TransportError`, `ServerError`, `PolicyDenied`, `ValidationError`, `TimeoutError`, `DeveloperError`, `DeprecatedError`

## Network & Retry Strategy

Automatic retry with exponential backoff:

- **Retry**: Network timeout / 408 / 429 / 5xx
- **No retry**: 4xx (except 408, 429)
- **Default**: 3 attempts, 1s → 2s → 4s backoff

Timeouts:
- Request: 30s
- Total (with retries): 60s
- Job polling: 60s (configurable)

## Performance Budgets

WP Kernel enforces these guarantees:

- **TTI**: < 1500ms on 3G
- **Added JS**: < 30KB gzipped
- **API response**: < 500ms (p95)
- **Background jobs**: Status updates < 100ms

## Next Steps

Dive into each primitive:

- [Resources](/guide/resources) - Data layer
- [Actions](/guide/actions) - Write orchestration
- [Events](/guide/events) - Canonical taxonomy
- [Block Bindings](/guide/block-bindings) - Read path
- [Interactivity](/guide/interactivity) - Front-end behavior
- [Jobs](/guide/jobs) - Background work
