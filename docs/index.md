---
layout: home

hero:
  name: "WP Kernel"
  text: "Modern WordPress Framework"
  tagline: A Rails-like, opinionated framework for building WordPress products where JavaScript is the source of truth
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/theGeekist/wp-kernel

features:
  - icon: 🎯
    title: Actions-First Architecture
    details: UI components never call transport directly. All writes route through Actions that orchestrate writes, emit events, invalidate caches, and queue jobs.
  
  - icon: 📦
    title: Typed Resources
    details: Define REST contracts once, get typed client + store + cache keys + events. One definition for your entire data layer.
  
  - icon: 🔌
    title: Block Bindings & Interactivity
    details: Bind core WordPress blocks to your data. Add behavior with the Interactivity API. No custom blocks needed for most use cases.
  
  - icon: 🎪
    title: Canonical Event Taxonomy
    details: Stable, versioned event system. JS hooks are canonical, PHP bridge mirrors selected events only. No ad-hoc event names.
  
  - icon: ⚡
    title: Background Jobs
    details: Enqueue long-running tasks with polling support. Built-in status tracking and automatic retries with exponential backoff.
  
  - icon: 🛡️
    title: Type-Safe & Tested
    details: TypeScript strict mode, JSON Schema validation, structured error handling (KernelError), and comprehensive E2E tests.
---

## Why WP Kernel?

WordPress has gone JS-first (Blocks, Interactivity, Script Modules), but teams still lose time wiring state, data, and glue per project. **WP Kernel gives you a clear path forward.**

### For Developers

- **Scaffold → Ship**: Generate features with resources, actions, views, and tests—no yak-shaving
- **Predictable State**: One store model (`@wordpress/data`) with resolvers & cache lifecycle
- **Extensibility Without Fear**: Single event taxonomy and SlotFill extension points

### For Product Teams

- **Shorter Lead Times**: Less boilerplate, more features
- **Lower Risk**: Typed REST contracts + versioning + deprecations
- **Future-Proof**: Built on official WordPress primitives; benefit as Core evolves

## The Golden Path

1. **Actions-First**: All writes go through Actions (enforced by lint + runtime)
2. **Resources**: Define your data contract once (typed, cached, versioned)
3. **Views**: Blocks with bindings (data in) and interactivity (behavior out)
4. **Events**: JS hooks are canonical; PHP listens through one mirrored bridge

## Quick Example

```typescript
// 1. Define a resource
export const thing = defineResource<Thing>({
  name: 'thing',
  routes: {
    list: { path: '/gk/v1/things', method: 'GET' },
    create: { path: '/gk/v1/things', method: 'POST' },
  },
  schema: import('../../contracts/thing.schema.json'),
});

// 2. Write an action
export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
  const created = await thing.create(data);
  CreateThing.emit(events.thing.created, { id: created.id, data });
  invalidate(['thing', 'list']);
  return created;
});

// 3. Use in UI
import { CreateThing } from '@/app/actions/Thing/Create';

const handleSubmit = async () => {
  await CreateThing({ data: formData });
};
```

## What's Included

- **Core Packages**: `@geekist/wp-kernel` (Resources, Actions, Events, Jobs)
- **UI Library**: `@geekist/wp-kernel-ui` (Components, Bindings, Interactivity)
- **Testing Utils**: `@geekist/wp-kernel-e2e-utils` (Playwright helpers, fixtures)
- **Development Tools**: Monorepo setup, wp-env, Playground, CI/CD templates

## Ready to Start?

<div style="margin-top: 2rem;">
  <a href="/getting-started/" style="display: inline-block; background: var(--vp-c-brand); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Started →</a>
</div>
