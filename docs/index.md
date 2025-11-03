---
title: WP Kernel
---

# Build modern WordPress plugins from one source of truth

WP Kernel gives WordPress developers a predictable workflow. Describe resources and capabilities in `wpk.config.ts`, run the CLI, and let the framework emit typed REST clients, PHP controllers, and admin UI scaffolding that follow the same contract. When you opt into DataViews metadata or block manifests, the generator adds those pieces too.

<div class="cta-buttons">
<a class="vp-button" href="/getting-started/quick-start">Quick Start</a>
<a class="vp-button" href="/examples/">See Examples</a>
<a class="vp-button" href="/guide/">Core Concepts</a>
</div>

## Conventions over glue code

`defineResource` provides REST helpers, cache keys, React hooks, and grouped APIs in one place. `wpk generate` turns that config into `.generated/` TypeScript declarations and PHP controllers, and `wpk apply` moves the PHP layer into `inc/`. You can review the builders in `packages/cli/src/builders` to see exactly what is produced.

```ts
// src/index.ts
import { configureWPKernel } from '@wpkernel/core/data';
import type { WPKInstance } from '@wpkernel/core/data';
import { wpkConfig } from '../wpk.config';

export function bootstrapKernel(): WPKInstance {
	return configureWPKernel({
		namespace: wpkConfig.namespace,
	});
}

export const kernel = bootstrapKernel();
```

## Works with the WordPress runtime

The kernel integrates with WordPress data stores and emits public events through `@wordpress/hooks`. Generated PHP controllers honour storage modes (`wp-post`, `wp-option`, `transient`) and fall back to `WP_Error(501, 'Not Implemented')` when you mark routes as local but omit storage. When you provide DataViews metadata in the config the CLI creates React screens under `.generated/ui/app/**` and admin menu shims under `.generated/php/Admin/**` so you can enqueue them immediately.【F:packages/cli/src/builders/php/resourceController.ts†L1-L220】【F:packages/cli/src/builders/ts.ts†L1-L200】

## Three ways to dive in

- **Getting Started** - Install the CLI and walk the golden path from `wpk init` through `wpk start`.
- **Guide** - Learn how resources, actions, capabilities, and UI bindings work together.
- **API Reference** - Browse the generated Typedoc for `@wpkernel/cli`, `@wpkernel/core`, and `@wpkernel/ui`.

When you are ready, begin with the [Quick Start](/getting-started/quick-start) or explore the [Showcase plugin](/examples/showcase) to see a full workflow in action.【F:docs/getting-started/quick-start.md†L1-L72】【F:examples/showcase/wpk.config.ts†L1-L115】
