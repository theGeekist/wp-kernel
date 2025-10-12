# TypeCheck Fixes Status

## Branch: fix/cli-typecheck-errors

## Problem

The CLI package's `tsconfig.tests.json` had `skipLibCheck: true` which was hiding TypeScript errors that VS Code was catching. Changed to match kernel package approach: include both source and test files with `composite: true`.

## Root Cause

TypeScript with project references was checking against built `.d.ts` files instead of performing full strict type checking on source code.

## Fix Applied

Updated `packages/cli/tsconfig.tests.json` to:

- Include both source files and test files (`"include": ["src/**/*", "../../tests/**/*", "../../types/**/*.d.ts"]`)
- Add `"composite": true`
- Remove project references
- This matches the kernel package pattern

Also updated root `tsconfig.json` to add `./packages/cli/tsconfig.tests.json` reference.

## Fixes Completed ✓

### 1. validate-kernel-config.test.ts

- Fixed circular type reference in `createReporterSpy` with explicit `ReporterSpy` interface
- Added non-null assertions (`!`) for `config.resources.thing` where we know values exist
- Imported `ResourceConfig` type and changed cast from `TestResourceConfig`

### 2. extensions.extra.test.ts

- Added explicit types for destructured parameters: `{ queueFile, outputDir: dir }: { queueFile: (path: string, content: string) => Promise<void>; outputDir: string; }`
- Fixed type conversion: `(ir as unknown as Record<string, unknown>)` instead of direct cast

### 3. extensions.test.ts

- Used `Reflect.deleteProperty(globalThis, 'structuredClone')` instead of `delete` operator
- Removed invalid `directories` field from IRPhpProject (added `outputDir` instead)

### 4. apply-command.test.ts

- Changed `Command` import to `BaseContext` from clipanion
- Added `colorDepth: 1` to context object
- Added `override` modifier to `toString()` method
- Added non-null assertions for `lines[0]!` in JSON.parse calls

### 5. dev-command.test.ts

- Imported `FSWatcher` type from chokidar
- Cast `FakeWatcher` instances as `unknown as FSWatcher`
- Added `colorDepth: 1` to BaseContext
- Added `override` modifier to `toString()`
- Cast back to FakeWatcher when accessing mock methods: `(watcher as unknown as FakeWatcher).close`

### 6. generate-command.test.ts

- Changed `Command` to `BaseContext`
- Added `colorDepth: 1`
- Added `override` to `toString()`

### 7. init-command.test.ts

- Changed `Command` to `BaseContext`
- Added `colorDepth: 1`

## Final Resolution

✓ **ALL TYPE ERRORS RESOLVED**

After final config adjustment (reverting to test-only pattern without skipLibCheck):

```bash
pnpm --filter @geekist/wp-kernel-cli typecheck:tests
# Output: Success! No type errors.
```

**Key insight**: Removing `skipLibCheck` alone was sufficient. We didn't need to include all source files with `composite: true`.

**Final config pattern**:

- Include: Only test files `["src/**/*.test.ts", "src/**/*.test.tsx"]`
- References: Kernel package (uses built `.d.ts` files)
- No skipLibCheck (catches errors VS Code sees)

**Ensures**:

- Test config only checks CLI test files
- No cross-package type checking of kernel source
- VS Code and typecheck:tests see same errors
- Source compilation remains unaffected

## Verification ✓

All checks passing after fix:

```bash
# Type check CLI tests
pnpm --filter @geekist/wp-kernel-cli typecheck:tests
# ✓ No errors

# Run CLI tests
pnpm --filter @geekist/wp-kernel-cli test
# ✓ 237 tests passed

# Full monorepo checks (ran via pre-commit hook)
pnpm typecheck && pnpm typecheck:tests && pnpm test:coverage
# ✓ All 5 packages type-check cleanly
# ✓ 1393 total tests passed
# ✓ Coverage: 98.57% statements, 92.63% branches, 99.34% functions
```

## Outcome

✓ **All type errors resolved** - No remaining work needed

**Problem**: `skipLibCheck: true` in CLI test config was hiding TypeScript strict mode errors that VS Code's IDE showed.

**Solution**: Removed `skipLibCheck` while keeping the original test-only include pattern with project references.

**Result**: Test type checking now catches the same errors as VS Code, without affecting source compilation or causing cross-package type checking.

**Pattern for other packages**: If other packages have similar issues, apply the same fix - remove `skipLibCheck` from test configs while keeping test-only includes with project references.
