# @wpkernel/e2e-utils

The E2E helpers accompany the showcase and CLI examples. We keep the README in the package as the canonical reference. When you need API details, read `packages/e2e-utils/README.md` directly.

For usage guidance, start with [E2E testing](/contributing/e2e-testing).

## Testing helpers

- `@wpkernel/test-utils/integration` – Shared workspace lifecycle helpers (`withWorkspace`, `createWorkspaceRunner`) re-exported here via `src/test-support/isolated-workspace.test-support.ts`.
- `src/test-support/cli-runner.test-support.ts` – `runNodeSnippet()` for capturing CLI transcripts inside tests.
