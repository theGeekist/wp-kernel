# Adding A New Workspace Package (And Wiring Internal Dependencies)

Bringing a new package online inside the wp-kernel monorepo, and then teaching it about sibling packages like `@wpkernel/core`, involves touching several pieces of tooling. This guide captures the process we followed for `@wpkernel/php-json-ast` and `@wpkernel/cli`, so the next package onboarding doesn’t require rediscovery.

## 1. Package manifest

1. Run `pnpm monorepo:create packages/<name>` (or `pnpm exec tsx scripts/register-workspace.ts create packages/<name>`) to scaffold the workspace. The generator emits the minimal `package.json`, TypeScript configs, Jest config, Vite config, smoke unit and integration tests, and source entry points.
    - Pass `--deps=@wpkernel/core,@wpkernel/ui` (comma separated) to pre-register internal dependencies. The script updates TypeScript references, adds `peerDependencies` with `workspace:*` versions, and surfaces a warning if you accidentally introduce a cycle (for example, if `ui` already points at your package). Use `pnpm monorepo:update packages/<name> --remove-deps=@wpkernel/ui` (or the `--remove-deps` flag during creation) to prune references and peer dependency entries.
2. In `package.json`:
    - Point `main`, `module`, and `types` at the `dist/` outputs (`./dist/index.js` / `index.d.ts`).
    - Ensure the standard scripts exist (`build`, `typecheck`, `typecheck:tests`, `lint`, `test`). The registration script inserts the typecheck targets automatically.
    - Declare sibling workspace packages in `peerDependencies` (e.g. `@wpkernel/core`, `@wpkernel/test-utils`). This matches our pattern of treating the shared packages as runtime peers rather than bundling them.
    - Optionally list the same packages under `devDependencies` if you need their tooling in tests, but keep runtime imports via peers.

## 2. TypeScript configuration

Every package needs two `tsconfig` files and they should extend the shared presets:

- **`tsconfig.json`** for source builds (`tsc --noEmit` and Vite declarations).
    - `extends: "../../tsconfig.lib.json"` so the shared compiler options (strictness, module resolution) stay in sync.
    - Override `compilerOptions.rootDir` with `./src` and `outDir` with `./dist`.
    - Include the package sources and shared declarations (`include: ["src/**/*", "../../types/**/*.d.ts"]`).
    - Exclude all tests to keep the build graph clean.
    - Add `"references"` to every sibling package whose types you import (e.g. `{ "path": "../core/tsconfig.json" }`, `{ "path": "../test-utils/tsconfig.json" }`).

- **`tsconfig.tests.json`** for test-only types (`pnpm typecheck:tests`).
    - `extends: "../../tsconfig.tests.json"` to pick up the shared Jest/Node typing preset.
    - Set `compilerOptions.rootDir` to the repository root (`../../`) and `outDir` to `./dist-tests` so cross-package fixtures resolve correctly.
    - Include the package tests, fixtures, and shared helpers (e.g. `../../tests/**/*`, `../../packages/test-utils/src/**/*`).
    - Exclude `dist/`, `dist-tests/`, and `node_modules/`.
    - Reference the source `tsconfig.json` **and** any sibling workspaces the tests rely on.

Running `pnpm monorepo:update packages/<name>` keeps both files aligned after manual edits and updates the root `tsconfig.json` references. Use `--deps=` when you want the script to insert sibling references during scaffolding; edit the generated files afterwards if you need bespoke include paths or prune relationships with `--remove-deps=`.

## 3. Jest configuration

Start from the shared helper exported via `@wpkernel/scripts/config/create-wpk-jest-config.js`:

1. Import `createWPKJestConfig` and call it with the package display name plus `packageDir: import.meta.url`.
2. Override `collectCoverageFrom`, `coverageThreshold`, or `testMatch` as needed. The helper already wires the path aliases from `tsconfig.base.json`, loads `tests/setup-jest.ts`, and scopes coverage to `src/`.
3. If a package requires extra ignores or module aliases (for example, UI’s custom JSX runtime), spread them on the returned config:

    ```ts
    const config = createWPKJestConfig({
    	displayName: '@wpkernel/php-json-ast',
    	packageDir: import.meta.url,
    });

    config.testPathIgnorePatterns = [
    	...(config.testPathIgnorePatterns ?? []),
    	'testUtils\\.test-support\\.(js|ts|tsx)$',
    ];
    ```

The helper keeps package Jest configs short and ensures they stay aligned when aliases or root behaviour change.

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

- ✓ Extract `createHelper` / pipeline primitives into `@wpkernel/core/pipeline` so packages like `php-json-ast` and `cli` stop duplicating the helper layer.
- Publish shared testing utilities (e.g. reporter mocks, pipeline context builders) via `@wpkernel/test-utils` so packages don’t need ad-hoc stubs.
- Add checks in CI to ensure every new package has references and peer dependency declarations before merging.
- Document this process in the contributing guide (link to this file) so package authors know where to start.

Once we have a repeatable generator (or adopt a monorepo toolkit), onboarding a new package should be minutes rather than an afternoon of chasing missing config.
