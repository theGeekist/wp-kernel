---
title: '@wpkernel/cli'
outline: [2, 3]
---

# @wpkernel/cli

The WPKernel CLI is the entry point to the framework.  
It scaffolds new or existing plugins, coordinates generation across PHP and TypeScript, and applies codemods through a shared pipeline so artefacts stay synchronised.

At a glance:

- **For plugin developers:** create, initialise, generate, and apply within WordPress projects.
- **For framework contributors:** extend adapters, register pipeline hooks, and maintain codemod flows.

## Overview

The CLI reads `wpk.config.ts`, builds an intermediate representation, and drives builders that output REST controllers, JS resource clients, and optional admin UI fixtures.  
Each step runs in a controlled pipeline with reporter diagnostics and validation of routes, capabilities, and schema bindings.

### Primary commands

| Command                                     | Where it runs               | Purpose                                                                                                                                                            |
| ------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`npm create @wpkernel/wpk@latest <dir>`** | Outside a project           | Creates a fresh WPKernel plugin folder. Installs dependencies, seeds config, and prepares a workspace ready for `wpk generate`.                                    |
| **`wpk init`**                              | Inside an existing plugin   | Adds the missing WPKernel scaffolds without touching existing code. Writes `wpk.config.ts` and baseline config files only. Safe to run multiple times.             |
| **`wpk generate`**                          | Inside a WPKernel workspace | Reads configuration, builds the IR, and emits artefacts into `.generated/**`. Produces PHP controllers, JS clients, and UI fixtures. No installation is performed. |
| **`wpk apply`**                             | Inside a WPKernel workspace | Applies queued changes after validation. Materialises codemod results or planned file moves and can create a commit when configured. Designed to be idempotent.    |
| **`wpk doctor`**                            | Anywhere in the workspace   | Runs environment and dependency checks. Verifies Node, PHP, Composer, and WordPress paths. Reports configuration or version issues with suggested fixes.           |

The CLI is non-destructive by default. It analyses the workspace before writing and reports what it created, modified, or skipped.  
Missing capabilities trigger warnings and temporarily fall back to `manage_options`, which keeps generated artefacts usable while you finish the map.

Framework contributors extend the same runtime. They add adapters or pipeline extensions that transform the IR before files are written. Each extension operates transactionally with commit and rollback, and surfaces diagnostics through the shared reporter.

---

## Related documentation

- **Plugin developer workflow:** [CLI → Plugin Developers](./cli/plugin-developers.md)
- **Framework contributor reference:** [CLI → Framework Contributors](./cli/framework-contributors.md)
- **Supporting packages:**
    - [`@wpkernel/pipeline`](./pipeline.md)
    - [`@wpkernel/php-json-ast`](./php-json-ast.md)
    - [`@wpkernel/test-utils`](./test-utils.md)
