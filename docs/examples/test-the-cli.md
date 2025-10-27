# Test the CLI

This example powers the CLI smoke tests. It keeps the project small so the generated artifacts are easy to inspect while still exercising the local route builders and apply workflow.【F:examples/test-the-cli/wpk.config.ts†L1-L48】

## What it covers

- Loads a minimal `wpk.config.ts` with a single transient-backed resource.
- Runs `wpk generate` and `wpk apply` end to end so you can examine `.generated/php/**` and the working `inc/` directory.
- Verifies composer autoloading and plugin headers without additional UI or schema baggage.

## Try it locally

```bash
pnpm install
pnpm --filter @examples/test-the-cli wpk generate
pnpm --filter @examples/test-the-cli wpk apply
```

Inspect the diff between `.generated/php/**` and `inc/**` after each run. The resource uses `storage.mode = 'transient'`, so the generated controller demonstrates how the PHP adapter handles non-post storage strategies.【F:examples/test-the-cli/wpk.config.ts†L27-L48】【F:packages/cli/src/next/builders/php/resourceController.ts†L1-L220】

## Files to review

1. `wpk.config.ts` - the single source of truth for the test scenario.
2. `.generated/php/Rest/ExampleItemController.php` - controller emitted by `wpk generate`.
3. `inc/Rest/ExampleItemController.php` - working copy after `wpk apply`.

Use this project when you need a fast feedback loop for CLI changes or when you are documenting how a printer behaves. Because the resource set is tiny you can iterate quickly without sorting through unrelated files.
