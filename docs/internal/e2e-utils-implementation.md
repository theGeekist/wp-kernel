# WP Kernel E2E Utils - Implementation Summary

## What We Built

A complete E2E testing utilities package that extends `@wordpress/e2e-test-utils-playwright` with kernel-specific helpers.

## Architecture

### Single Consolidated Factory Pattern

✓ **One file, three internal helpers** (`createWPKernelUtils.ts`):

- `createResourceHelper<T>()` - Internal function for REST operations
- `createStoreHelper<T>()` - Internal function for store state testing
- `createEventHelper<P>()` - Internal function for event tracking
- `createWPKernelUtils()` - Main export returning `{ resource(), store(), events() }`

### Extended Test Fixture Pattern

✓ **WordPress fixture extension** (`test.ts`):

```typescript
import { test as base } from '@wordpress/e2e-test-utils-playwright';

export const test = base.extend<{ kernel: KernelUtils }>({
	kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
		const wpk = createWPKernelUtils({
			page,
			requestUtils,
			admin,
			editor,
			pageUtils,
		});
		await use(kernel);
	},
});
```

## Usage Patterns

### Primary Usage (Recommended)

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test('my test', async ({ admin, kernel, page }) => {
	// WordPress fixtures + wpk fixture all available
});
```

### Advanced Usage

```typescript
import { createWPKernelUtils } from '@wpkernel/e2e-utils';
import { test as base } from '@wordpress/e2e-test-utils-playwright';

// Custom fixture setup
export const test = base.extend({
	kernel: async (fixtures, use) => {
		const wpk = createWPKernelUtils(fixtures);
		// Custom setup...
		await use(kernel);
	},
});
```

## Package Exports

```typescript
// From packages/e2e-utils/src/index.ts
export { test, expect } from './test.js'; // Primary usage
export { createWPKernelUtils } from './createWPKernelUtils.js'; // Advanced usage
export type {} from /* all types */ './types.js'; // TypeScript support
```

## Why This Design?

### Dependency Injection Pattern

Test author and wpk utilities both need WordPress fixtures, but for different purposes:

**Test author**: Uses fixtures for test orchestration

```typescript
test('my test', async ({ admin, page }) => {
	await admin.visitAdminPage('...'); // Direct usage for navigation
	await expect(page.getByText('...')).toBeVisible(); // Direct usage for assertions
});
```

**Kernel utilities**: Uses fixtures for implementation

```typescript
// Inside createWPKernelUtils
const seed = async (data) => {
  return await requestUtils.rest({ ... });  // Internal REST calls
};

const wait = async (selector) => {
  return await page.waitForFunction(...);  // Internal store evaluation
};
```

### No Duplication - It's Composition

- WordPress fixtures → wpk (for implementation)
- WordPress fixtures → test callback (for orchestration)
- Both have access, different purposes

## Files Created

```
packages/e2e-utils/src/
├── createWPKernelUtils.ts   # Single consolidated factory (400+ lines)
├── test.ts                # Extended test fixture with kernel
├── types.ts               # TypeScript interfaces
└── index.ts               # Public exports

packages/e2e-utils/
├── MIGRATION.md           # Migration guide from vanilla Playwright
└── README.md              # Usage documentation
```

## Files Deleted (Consolidated)

- ✗ `createResourceUtils.ts` → Moved to internal function
- ✗ `createStoreUtils.ts` → Moved to internal function
- ✗ `createEventUtils.ts` → Moved to internal function

## Next Steps

1. Write unit tests (≥90% coverage)
2. Migrate showcase app tests to use new utilities
3. Add more examples to MIGRATION.md
4. Consider generic type constraints for `T = unknown`

## Success Criteria

✓ Single consolidated factory (not multiple files)  
✓ Follows WordPress E2E utils pattern (extended fixture)  
✓ Primary usage: `import { test, expect }`  
✓ Advanced usage: `import { createWPKernelUtils }`  
✓ Build passes  
✓ Documentation complete  
⏳ Unit tests (pending)

## Why This Matters

- **Consistency**: Same pattern as WordPress uses (familiar to WP developers)
- **Simplicity**: One import, all utilities available
- **Flexibility**: Advanced users can customize fixture setup
- **Type Safety**: Full TypeScript support with generics
- **Maintainability**: Single file, internal helpers, clear boundaries
