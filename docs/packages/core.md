# @wpkernel/core

Read the generated API at [/api/core/](/api/core/). The guide pages complement it with context:

- [Resources](/guide/resources)
- [Actions](/guide/actions)
- [Events](/guide/events)
- [Blocks](/guide/blocks)
- [Reporting](/guide/reporting)

## Testing helpers

- `tests/wp-environment.test-support.ts` – `createWordPressTestHarness()` bootstraps `window.wp` and exposes `reset`/`teardown` utilities.
- `tests/action-runtime.test-support.ts` – `withActionRuntimeOverrides()` scopes `__WP_KERNEL_ACTION_RUNTIME__` changes and cleans up automatically.
