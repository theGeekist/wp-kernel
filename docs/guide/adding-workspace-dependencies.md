# Adding A New Workspace Package (And Wiring Internal Dependencies)

Bringing a new package online inside the wp-kernel monorepo, and then teaching it about sibling packages like `@wpkernel/core`, involves touching several pieces of tooling. This guide captures the process we followed for `@wpkernel/php-json-ast` and `@wpkernel/cli`, so the next package onboarding doesn’t require rediscovery.

## 1. Package manifest

1. Create the package directory under `packages/` with at minimum:
    - `package.json`
    - `tsconfig.json`
    - `tsconfig.tests.json`
    - `vite.config.ts` (if it is a buildable library)
    - `jest.config.js` (or rely on root config if appropriate)
2. In `package.json`:
    - Point `main`, `module`, and `types` at the `dist/` outputs (`./dist/index.js` / `index.d.ts`).
    - Add `scripts` for `build`, `typecheck`, `typecheck:tests`, `lint`, `test`, mirroring existing packages.
    - Declare sibling workspace packages in `peerDependencies` (e.g. `@wpkernel/core`, `@wpkernel/test-utils`). This matches our pattern of treating the shared packages as runtime peers rather than bundling them.
    - Optionally list the same packages under `devDependencies` if you need their tooling in tests, but keep runtime imports via peers.

## 2. TypeScript configuration

Every package needs two `tsconfig` files:

- **`tsconfig.json`** for source builds (`tsc --noEmit` and Vite declarations).
    - `extends: "../../tsconfig.base.json"`.
    - `compilerOptions.rootDir` = `./src`, `outDir` = `./dist`, `composite: true`.
    - Include both the package sources and the shared `types/**/*.d.ts`:  
      `include: ["src/**/*", "../../types/**/*.d.ts"]`.
    - Exclude all tests to keep the build graph clean.
    - Add `"references"` to every sibling package whose types you import (e.g. `{ "path": "../core/tsconfig.json" }`, `{ "path": "../test-utils/tsconfig.json" }`).

- **`tsconfig.tests.json`** for test-only types (`pnpm typecheck:tests`).
    - `rootDir: "."`, `outDir: "./dist-tests"`, `types: ["jest","node"]`.
    - Include the test files (`src/**/__tests__/**/*`, `tests/**/*`) and any fixtures.
    - Exclude `dist/`, `dist-tests/`, `node_modules/`.
    - Add references back to the source `tsconfig.json` **and** the sibling workspaces the tests rely on.

This reference graph is what enables `tsc --build` and Vite’s declaration plugin to resolve modules produced by other packages without copying source files.

## 3. Jest configuration

Start from the package template in `packages/cli/jest.config.js`:

1. Set `displayName` and `rootDir` the same way (`path.resolve(__dirname, '../..')`).
2. Copy the `moduleNameMapper` entries that remap `@wpkernel/*` imports to source folders. This ensures Jest compiles the TypeScript instead of trying to load `.js` output from `node_modules`.
3. Point `setupFilesAfterEnv` to `tests/setup-jest.ts` if the package needs the shared test globals.
4. Keep coverage limited to the package's `src/` tree.
5. **Test support utilities**: If your package includes `.test-support.ts` files (utility functions for tests, not actual test files), add them to `testPathIgnorePatterns`:
    ```js
    testPathIgnorePatterns: [
        ...baseConfig.testPathIgnorePatterns,
        'testUtils\\.test-support\\.(js|ts|tsx)$',
    ],
    ```
    This prevents Jest from trying to run utility files as test suites while still allowing actual test files like `test-support.test.ts` to run normally.

**Note**: The main `jest.config.js` at the monorepo root also includes this pattern in its `testPathIgnorePatterns`, so global test runs (`pnpm test` from root) will automatically exclude these files. Individual packages need their own ignore patterns since they use separate Jest configurations.

## 4. ESLint configuration

Nothing special is required beyond the root `eslint.config.js`, but if the package needs custom rules or leniencies:

- Add an override block (see the CLI override near the end of `eslint.config.js`).
- Avoid compiling TypeScript directly into `src/`; keep generated JS in `dist/`, otherwise lint will treat the build artefacts as source files.

## 5. Vite configuration (library packages)

We use `createWPKLibConfig` from the root `vite.config.base.ts`:

```ts
import { createWPKLibConfig } from '../../vite.config.base';

export default createWPKLibConfig('@wpkernel/php-json-ast', {
	index: 'src/index.ts',
});
```

If the package exports additional entry points (e.g. `context`, `nodes`), add them to the map. Ensure `vite.config.base.ts`’s default `external` array treats sibling packages as externals (add regexes similar to the CLI entry if needed).

## 6. Verifying the workflow

After wiring a new package or adding a dependency, run the same set of checks we enforce in CI:

```bash
pnpm --filter <package> lint --fix
pnpm --filter <package> typecheck
pnpm --filter <package> typecheck:tests
pnpm --filter <package> test
pnpm --filter <package> build
```

Running them as you add each config piece saves time diagnosing cross-config issues later.

## 7. Common troubleshooting

### Jest "Your test suite must contain at least one test" error

If you see this error for `.test-support.ts` files, it means Jest is trying to run utility files as test suites. This happens when:

1. The file name matches Jest's `testMatch` patterns but contains no actual tests
2. The `testPathIgnorePatterns` in your Jest config doesn't exclude utility files

**Solution**: Add the ignore pattern to your package's `jest.config.js`:

```js
testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    'testUtils\\.test-support\\.(js|ts|tsx)$',
],
```

**File naming convention**:

- `*.test-support.ts` = utility files (should be ignored)
- `*.test-support.test.ts` = actual tests for utility functionality (should run)

## 8. Automation opportunities

The steps above are deterministic but verbose. Useful automation ideas:

1. **Package scaffolding script**
    - Generate the directory, boilerplate `package.json`, tsconfigs, Jest config, Vite config, and documentation with a single command (e.g. `pnpm create wpkernel-package <name>`).
    - Pre-populate peer dependencies and references based on prompts (`--with-core`, `--with-ui`, etc.).

2. **Config synchronisation tooling**
    - A workspace script that updates all package `tsconfig`/`tsconfig.tests` references when new packages are added. Tools like [`@arethetypeswrong/cli`](https://github.com/privatenumber/arethetypeswrong.com) or simple AST transforms can keep them in sync.

3. **Monorepo orchestration**
    - Evaluate Nx, Turborepo, or Lage to manage graph-aware task running, dependency detection, and scaffolding. Each brings generators, project references, and caching that could reduce manual updates.

4. **Boilerplate removal**
    - Publish shared testing utilities (e.g. reporter mocks, pipeline context builders) via `@wpkernel/test-utils` so packages don’t need ad-hoc stubs.

## 9. Next steps

- Extract `createHelper` / pipeline primitives into `@wpkernel/core` so packages like `php-json-ast` and `cli` stop duplicating the helper layer.
- Publish shared testing utilities (e.g. reporter mocks, pipeline context builders) via `@wpkernel/test-utils` so packages don’t need ad-hoc stubs.
- Add checks in CI to ensure every new package has references and peer dependency declarations before merging.
- Document this process in the contributing guide (link to this file) so package authors know where to start.

Once we have a repeatable generator (or adopt a monorepo toolkit), onboarding a new package should be minutes rather than an afternoon of chasing missing config.
