# Introduction

WP Kernel is a Rails-like, opinionated framework for building modern WordPress products where **JavaScript is the source of truth** and **PHP is a thin contract** (REST + capabilities + optional server bindings).

## What This Is (In Plain English)

We're building a standardized way to make WordPress plugins and themes in 2025+: blocks + bindings + interactivity on the surface, actions for business logic, resources for data, and a single PHP bridge for legacy extensibility.

**It's not another heavy framework.** It's a small, opinionated kernel that gives you boring, reliable plumbing so you can focus on building features.

## Core Philosophy

### Actions-First Rule

UI components **never** call transport directly. Always route writes through Actions.

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

**Why?** Actions orchestrate writes, emit events, invalidate caches, and queue jobs. Direct transport calls bypass this orchestration.

### The Read Path vs Write Path

**Read Path**: View pulls data via bindings → store selectors

```typescript
// Client-side binding
registerBindingSource('gk', {
	'thing.title': (attrs) => select('gk/thing').getById(attrs.id)?.title,
});
```

**Write Path**: View triggers Action → Resource (REST) → Events + cache invalidation → UI updates

```typescript
export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	const created = await thing.create(data);
	CreateThing.emit(events.thing.created, { id: created.id });
	invalidate(['thing', 'list']);
	return created;
});
```

## Who It's For

### Developers

- You want **one mental model** for editor, front-end, and admin
- You're tired of writing the same data/state wiring per project
- You need **extensibility without fear** (stable hooks, clear contracts)

### Agencies & Product Teams

- You need **velocity without spaghetti**
- You want **predictable delivery** and maintainable code
- You care about **time-to-market** and long-term scalability

### Business Owners

- You want features shipped **faster and more reliably**
- You need code that's **easy to extend** and **easy to hire for**
- You want to **leverage WordPress** without fighting it

## What It Enables

### A Day-One Story

**Task**: "Add an 'Apply' button that creates an application, shows a toast, and moves a card on the admin board."

**Implementation**:

1. Scaffold Resource `application`
2. Write Action `Application.Submit` (permission check → REST → emit `wpk.application.created` → invalidate list → enqueue parsing job)
3. Bind a Button in the block editor to the Interactivity action
4. Optional: PHP plugin listens to `wpk.bridge.application.created` to notify HR

**Time to value**: Minutes, not days.

## How It Fits with WordPress Core

We reuse WordPress' own packages and primitives:

- **Script Modules** + import maps (native ESM, no globals)
- **@wordpress/data** (state management)
- **Block Bindings** (data → content)
- **Interactivity API** (front-end behavior)
- **@wordpress/hooks** (events)
- **core/notices** (UX feedback)

You don't learn a new universe; you apply a clear set of conventions on top of Core.

## Key Guarantees

1. **Actions-first**: UI never writes directly to transport (enforced)
2. **JS hooks canonical**: PHP bridge mirrors selected events only
3. **Type safety**: Resources generate types from JSON Schema
4. **Event stability**: Names frozen in major versions
5. **Performance budgets**: TTI < 1500ms, added JS < 30KB gz
6. **Retry strategy**: Automatic with exponential backoff
7. **Error structure**: All errors are typed `KernelError`s
8. **Cache lifecycle**: Explicit invalidation, no magic

## Next Steps

Ready to get started?

- [Installation](/getting-started/installation) - Set up your development environment
- [Quick Start](/getting-started/quick-start) - Build your first feature
- [Core Concepts](/guide/) - Understand Resources, Actions, Events, and more
