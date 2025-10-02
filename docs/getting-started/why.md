# Why WP Kernel?

> Understanding the philosophy and vision behind the framework

## What This Is (In Plain English)

We're building a **Rails-like way to make WordPress products** where JavaScript is the source of truth and PHP is a thin contract (REST + capabilities + optional SEO bindings). We call it the WP Kernel.

It's not another heavy framework. It's a **small, opinionated kernel** that standardizes how teams build plugins/themes in 2025+ WordPress: blocks + bindings + interactivity on the surface, actions for business logic, resources for data, and a single PHP bridge for legacy/extensibility.

---

## Why Now?

- **WordPress has gone JS-first** (Blocks, Interactivity, Script Modules)
- **Teams still lose time** wiring state, data, and glue per project
- **Business owners want** predictable delivery; devs want boring, reliable plumbing

**WP Kernel gives both.**

---

## Who It's For

### Developers

Who want one mental model for editor, front-end, and admin.

### Agencies & Product Teams

Who need velocity without spaghetti.

### Business Owners

Who care about time-to-market, maintainability, and extensibility.

---

## The Golden Path

### The "Way to Do Things"

1. **Actions-first for all writes** - UI never talks to the server directly
2. **Resources define your data contract once** - Typed, cached, versioned
3. **Views are blocks with bindings** - Data in, behavior out via Interactivity

**JS hooks are canonical; PHP listens through one mirrored bridge. That's it.**

---

## What It Enables

### For Developers

✅ **Scaffold → Ship**
Generate a feature with resources, actions, views, tests—no yak-shaving.

✅ **Predictable State**
One store model (`@wordpress/data`) with resolvers & cache lifecycle.

✅ **Extensibility Without Fear**
A single event taxonomy and SlotFill points.

### For the Business

📈 **Shorter Lead Times**
Less boilerplate, more features.

🛡️ **Lower Risk**
Typed REST contracts + versioning + deprecations.

🚀 **Future-Proof**
Built on official WP primitives; you benefit as Core evolves.

---

## How It Fits Together

```mermaid
flowchart LR
  U[User] --> V[View\n(Blocks + Bindings + Interactivity)]
  V -->|triggers| A[Action\n(orchestrates)]
  A -->|calls| R[Resource\n(REST client)]
  R -->|fetches| WP[(WordPress REST\ncaps + schema)]
  A -->|emits| E[Events\n(JS hooks)]
  A -->|queues| J[Job\n(enqueue/status)]
  E --> B[Bridge\n(PHP mirror for legacy)]
  J --> WP
  WP --> R --> V
```

### Read Path

View pulls data via bindings → store selectors.

### Write Path

View triggers Action → Resource (REST) → Events + cache invalidation → UI updates.

### Legacy/SEO

Optional server bindings + Bridge for PHP listeners.

---

## What It Looks Like to Use

### Mental Model (Not Code)

- **Declare a Resource** (one object) → you get a client + store + cache keys
- **Write an Action** → you get events, invalidation, job helpers
- **Bind any core block** to your store selectors → content just appears
- **Sprinkle Interactivity** for behavior without a single jQuery-ism
- **Extend via hooks and SlotFill** - in JS (canon) or PHP (bridge), your pick

---

## A Day-One Story

### The Lightbulb Moment

**Task:** "Add an 'Apply' button that creates an application, shows a toast, and moves a card on the admin board."

**Solution:**

1. Scaffold Resource `application`
2. Write Action `Application.Submit`:
    - Permission check
    - REST call
    - Emit `wpk.application.created`
    - Invalidate list cache
    - Enqueue parsing job
3. Bind a Button in the block editor to the Interactivity action
4. _(Optional)_ A PHP plugin listens to `wpk.bridge.application.created` to notify HR

**Time to value: minutes, not days.**

---

## How We Stay Close to Core

### Low on Bloat

We reuse WordPress' own packages and ideas:

- **Script Modules + import maps** - Native ESM, no globals
- **@wordpress/data** - State management
- **Block Bindings** - Data binding without custom blocks
- **Interactivity API** - Declarative front-end behavior
- **@wordpress/hooks** - Event system
- **core/notices** - UX feedback

**You don't learn a new universe**—you apply a clear set of conventions on top of Core.

---

## The Development Experience

```mermaid
graph TD
  A[Scaffold] --> B[Dev Server\nwp-env + Playground]
  B --> C[Build\n@wordpress/scripts (ESM)]
  C --> D[Unit Tests\nJest preset]
  B --> E[E2E\nPlaywright + WP utils]
  D --> F[CI]
  E --> F[CI]
  F --> G[Release\nChangesets]
```

### One Repo, One Flow

- **One repo** (pnpm workspaces)
- **One set of commands**
- **One CI pipeline**

Write code the way Core does; ship faster because the kernel decides the boring bits.

---

## What's Coming Next

### Sprint 0 ✅ Complete

The full environment—monorepo, local WP, Playground, build, lint, tests, CI—done with real DoD.

### Sprint 1 ✅ Complete

The kernel's first slice: **Resources & Stores** demonstrated end-to-end with a working showcase.

### Sprint 1.5 ✅ Complete

**Build tooling & Resources refactor** - Vite migration, dual-surface API, 2-3x faster builds.

### Coming Soon

- Sprint 2: E2E Utils
- Sprint 3: Policies & Permissions
- Sprint 4: Actions & Events (full taxonomy)
- Sprint 8: Jobs & Background Processing
- Sprint 9: PHP Bridge

See the [Roadmap](https://github.com/theGeekist/wp-kernel/blob/main/information/Roadmap%20PO%20%E2%80%A2%20v1.0.md) for the complete plan.

---

## In One Sentence

> **WP Kernel gives you the speed of Rails with the reach of WordPress**—a small, opinionated path that lets developers move quickly and lets businesses see value sooner, without locking either into a dead-end.

_(Also, fewer "Why does this handle load before that import map?" conversations. You're welcome.)_

---

## Ready to Start?

- **[Installation Guide](/getting-started/installation)** - Set up your development environment
- **[Quick Start Tutorial](/getting-started/quick-start)** - Build your first feature in 15 minutes
- **[Core Concepts](/guide/)** - Deep dive into Resources, Actions, Events, and more
- **[Showcase Plugin](/guide/showcase)** - See a complete real-world example

---

## Questions or Feedback?

- **[GitHub Issues](https://github.com/theGeekist/wp-kernel/issues)** - Report bugs or request features
- **[Discussions](https://github.com/theGeekist/wp-kernel/discussions)** - Ask questions, share ideas
- **[Contributing Guide](/contributing/)** - Learn how to contribute
