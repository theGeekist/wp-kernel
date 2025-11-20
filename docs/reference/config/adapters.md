# Adapters (`adapters`)

The `adapters` object in `wpk.config.ts` is WPKernel’s plug-in point for projects that need to go beyond the standard generation pipeline. Most applications never need it — the built-in builders already generate PHP controllers, JS clients, UI fixtures, and plugin loaders that cover the vast majority of WordPress + TypeScript workflows.

But when you _do_ need to customise generation logic, adapters give you a clean, structured way to participate in the pipeline without forking the framework or hacking the output. They let you:

- Insert custom build steps
- Emit project-specific files
- Override namespace/loader behaviour
- Add extensions that run before or after core builders
- Mutate the IR (carefully) before generation takes place

Adapters come in two forms — `php` and `extensions` — each suited to a different kind of customization.

---

## `adapters.php`

This hook lets you customise low-level PHP code generation. It is deliberately surgical: a single factory function returns overrides that the PHP builder consumes when writing controllers, helpers, and plugin loaders.

Use this only when you need to shape the PHP layer in a way that cannot be expressed through normal configuration.

- **What it does**
  Returns a factory that can override namespace roots, autoload paths, file destinations, or even manipulate the PHP AST before files are written.

- **When to use it**
    - Integrating with a legacy PHP namespace structure
    - Emitting additional `.php` files that must live alongside generated controllers
    - Redirecting generated files into a project-specific autoload tree
    - Applying low-level AST transforms (formatting, custom guards, annotations)

- **Why most projects won’t need it**
  Standard WordPress namespaces, loader conventions, and file layout are already handled by the PHP builder.
  For anything that doesn’t require AST-level work, use `adapters.extensions` instead — it’s simpler, safer, and more modular.

**Schema:**

- **Type:** `function` (factory)
- **Required:** No

---

## `adapters.extensions`

This is the general-purpose extension mechanism, and the one most WPKernel users reach for. It accepts an array of factory functions, each returning an extension object that participates in the pipeline alongside WPK’s own builders.

Extensions offer a high-level, friendly API: they receive the current IR, filesystem queue, logger, and helpers for formatting or registering files. They do **not** need to understand the entire PHP/TS builder internals — they simply compose with them.

- **What it does**
  Each entry in the array returns an extension with a `name` and an `apply(ctx)` method.
  During `wpk generate`, these extensions run at predictable points and can:
    - Queue additional files
    - Read the IR (resources, schemas, storage metadata, capabilities)
    - Emit custom TS clients, documentation, fixtures, stubs
    - Write integration code for analytics/webhooks/telemetry
    - Scaffold files that must remain synced with config

- **When to use it**
    - You want to participate in generation without touching low-level builders
    - You want reusable logic that can ship as its own NPM package
    - You want a plugin-like system that keeps your project clean
    - You want to inspect resources/schemas and emit artifacts based on them

- **Why this is the recommended path**
  Extension factories are composable, testable, and safe. They don’t require AST knowledge, and they mirror the philosophy of the rest of WPKernel: deterministic, declarative, and pipeline-driven.

- **Further reading**
  See the canonical **[Extensions Guide](../guide/extensions.md)** for a deep dive and real project examples.

**Schema:**

- **Type:** `array` of functions
- **Required:** No
