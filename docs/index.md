---
title: WP Kernel
---

# Build modern WordPress plugins from one source of truth

WP Kernel gives WordPress developers a predictable workflow. Describe resources and policies in `kernel.config.ts`, run the CLI, and let the framework emit typed REST clients, PHP controllers, and admin UI scaffolding that follow the same contract. When you opt into DataViews metadata or block manifests, the generator adds those pieces too.

<div class="cta-buttons">
<a class="vp-button" href="/getting-started/quick-start">Quick Start</a>
<a class="vp-button" href="/examples/">See Examples</a>
<a class="vp-button" href="/guide/">Core Concepts</a>
</div>

## Conventions over glue code

`defineResource` provides REST helpers, cache keys, React hooks, and grouped APIs in one place. `wpk generate` turns that config into `.generated/` TypeScript declarations and PHP controllers, and `wpk apply` moves the PHP layer into `inc/`. You can review the printers in [`packages/cli/src/printers`](../packages/cli/src/printers) to see exactly what is produced.

```ts
// src/index.ts
import { configureKernel } from '@wpkernel/core/data';
import type { KernelInstance } from '@wpkernel/core/data';
import { kernelConfig } from '../kernel.config';

export function bootstrapKernel(): KernelInstance {
	return configureKernel({
		namespace: kernelConfig.namespace,
	});
}

export const kernel = bootstrapKernel();
```

## Works with the WordPress runtime

The kernel integrates with WordPress data stores and emits public events through `@wordpress/hooks`. Generated PHP controllers honour storage modes (`wp-post`, `wp-option`, `transient`) and fall back to `WP_Error(501, 'Not Implemented')` when you mark routes as local but omit storage. When you provide DataViews metadata in the config the CLI creates React screens under `.generated/ui/app/**` and admin menu shims under `.generated/php/Admin/**` so you can enqueue them immediately.【F:packages/cli/src/printers/php/printer.ts†L1-L73】【F:packages/cli/src/printers/ui/printer.ts†L1-L120】

## Three ways to dive in

- **Getting Started** - Install the CLI and walk the golden path from `wpk init` through `wpk start`.
- **Guide** - Learn how resources, actions, policies, and UI bindings work together.
- **API Reference** - Browse the generated Typedoc for `@wpkernel/cli`, `@wpkernel/core`, and `@wpkernel/ui`.

When you are ready, begin with the [Quick Start](/getting-started/quick-start) or explore the [Showcase plugin](/examples/showcase) to see a full workflow in action.【F:docs/getting-started/quick-start.md†L1-L72】【F:examples/showcase/kernel.config.ts†L1-L115】
