# Showcase E2E Coverage Snapshot

The showcase plugin now focuses on a lean admin workflow that exercises the
real resource + action stack while keeping the UI predictable for Playwright.

## What the suite covers

- **Admin smoke tests** (`jobs-admin.spec.ts`)
    - Verifies the jobs dashboard renders WordPress seed data
    - Confirms search filtering works without brittle selectors
    - Validates status filtering against resource seeded fixtures
- **Job creation** (`job-create.spec.ts`)
    - Drives the new form end-to-end through the `CreateJob` action
    - Asserts feedback messaging and table hydration via the resource store
- **e2e-utils integration** (`resource-utils.spec.ts`)
    - Exercises `kernel.resource().seed`, `seedMany`, and `remove`
    - Confirms cleanup through REST responses to keep the transient cache tidy

Each spec runs serially and tears down its own data by removing transient jobs
created during the test. This keeps the sample dataset stable and highlights the
exact step that fails when a regression appears.

## Patterns to reuse

```ts
const jobResource = kernel.resource<Job>({
	name: 'job',
	routes: {
		list: { path: '/wp-kernel-showcase/v1/jobs', method: 'GET' },
		create: { path: '/wp-kernel-showcase/v1/jobs', method: 'POST' },
		remove: { path: '/wp-kernel-showcase/v1/jobs/:id', method: 'DELETE' },
	},
});

const job = await jobResource.seed({ title: 'QA Lead', status: 'draft' });
await jobResource.remove(job.id);
```

When adding scenarios:

1. Seed fixtures first, then navigate to the admin page.
2. Use `data-testid` attributes (`jobs-*`) for deterministic selectors.
3. Track created IDs and clean them up in `afterEach`.
4. Prefer focused specs over mega-flows to isolate flaky behaviour quickly.

Running the full matrix locally mirrors CI:

```
pnpm --filter wp-kernel-showcase test # Jest unit suite
pnpm --filter wp-kernel-showcase e2e  # Playwright suite
```

If you extend coverage, update this file with the intent of each spec so future
agents can evaluate regressions without re-reading the entire codebase.
