[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / createKernelUtils

# Function: createKernelUtils()

```ts
function createKernelUtils(fixtures): KernelUtils;
```

Create kernel-aware E2E utilities

Single factory that produces resource, store, and event helpers
for testing WP Kernel applications.

## Parameters

### fixtures

[`WordPressFixtures`](../type-aliases/WordPressFixtures.md)

WordPress E2E fixtures from test context

## Returns

[`KernelUtils`](../type-aliases/KernelUtils.md)

Kernel utilities object with helper factories

## Example

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test('job workflow', async ({ page, admin, requestUtils, kernel }) => {
  const job = kernel.resource({ name: 'job', routes: {...} });
  await job.seed({ title: 'Engineer' });

  const jobStore = kernel.store('my-plugin/job');
  await jobStore.wait(s => s.getList());

  const recorder = await kernel.events({ pattern: /^my-plugin\.job\./ });
  expect(recorder.list()).toHaveLength(1);
});
```
