pnpm lint --fix
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build

yep-this is a classic “drift everywhere” monorepo. The good news: you can collapse ~80% of this with one source of truth and a couple tiny helpers.

What’s biting you
• Conflicting TS resolution: root uses "moduleResolution": "bundler" but some packages override to "node" (e.g. core, php-driver). That forces custom Jest/Vite aliases and odd edge-cases.
• Path maps copied everywhere: paths live in tsconfig.base.json, but are re-declared across package/test configs and Vite/Jest configs.
• Jest mappers duplicated: each package re-lists moduleNameMapper (and the @wordpress/element/jsx-runtime shim).
• Vite aliases duplicated: manual resolve.alias sprinkled around while you already depend on vite-tsconfig-paths.

Quick, surgical fixes (incremental PRs)

1. Make TS the single source of truth
   • Keep all paths only in tsconfig.base.json.
   • Pick one moduleResolution for libs (recommend: bundler for modern bundlers). Only override in a package if you must (rare).
   → First pass: delete "moduleResolution": "node" from package tsconfigs that don’t truly need it.

Audit with:

git grep -n '"moduleResolution":' -- '\*_/tsconfig_.json'

2. Auto-generate Jest moduleNameMapper from TS paths

Stop hand-curating the massive moduleNameMapper blocks.

jest.config.base.js (ESM-safe)

// jest.config.base.js
import { pathsToModuleNameMapper } from 'ts-jest';
import fs from 'node:fs';

const tsconfig = JSON.parse(fs.readFileSync(new URL('./tsconfig.base.json', import.meta.url)));

const moduleNameMapper = {
// strip trailing .js so ESM import('x.js') works on TS sources
'^(\\.{1,2}/.\*)\\.js$': '$1',
  ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  // Special case: allow React runtime during tests
  '^@wordpress/element/jsx-runtime$': 'react/jsx-runtime',
};

export default {
preset: '@wordpress/jest-preset-default',
testEnvironment: 'jsdom',
transform: {
'^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
    '^(?:.+/)?eslint-rules/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true } }],
},
moduleNameMapper,
watchman: false,
maxWorkers: '50%',
testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.wp-env/'],
coverageThreshold: { global: { branches: 80, functions: 83, lines: 88, statements: 88 } },
};

Then in every package’s jest.config.js, reduce to:

import base from '../../jest.config.base.js';

export default {
...base,
displayName: '@wpkernel/<pkg>',
rootDir: new URL('../..', import.meta.url).pathname,
testMatch: ['<rootDir>/packages/<pkg>/**/__tests__/**/*.(test|spec).ts?(x)'],
collectCoverageFrom: ['<rootDir>/packages/<pkg>/src/**/*.{ts,tsx}', '!**/__tests__/**', '!**/*.d.ts', '!**/index.ts'],
};

Delete all the repeated moduleNameMapper blocks. Leave the few package-specific coverage ignores if you really need them.

3. Let Vite read TS paths (and delete the hand-written aliases)

You already have vite-tsconfig-paths. Use it everywhere and strip aliases.

Add to each vite.config.ts:

import tsconfigPaths from 'vite-tsconfig-paths';

export default createWPKLibConfig('<name>', { /_ entries _/ }, { external }).plugins ??= [];
// ensure plugins array exists, then:
config.plugins = [...(config.plugins ?? []), tsconfigPaths()];
export default config;

In examples/showcase, replace the manual resolve.alias with the plugin:

import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(async (env) => ({
plugins: [
v4wp(/*...*/),
...(await wpScripts({ extraScripts: { '@wordpress/interactivity': 'wp.interactivity' } })),
tsconfigPaths(),
],
// keep your external/globals logic
}));

4. Simplify test type-checking tsconfigs

Those tsconfig.tests.json / tsconfig.tests.typecheck.json files mostly duplicate base settings and paths. Replace them with:
• A single tsconfig.tests.base.json at repo root:

{
"$schema": "https://json.schemastore.org/tsconfig",
"extends": "./tsconfig.base.json",
"compilerOptions": {
"composite": false,
"noEmit": true,
"types": ["jest", "node"]
}
}

    •	In packages, make tsconfig.tests.json:

{ "extends": "../../tsconfig.tests.base.json", "include": ["src/**/*.test.ts", "src/**/*.test.tsx"] }

    •	Update scripts to use tsc -p packages/*/tsconfig.tests.json --noEmit (or just rely on jest+ts-jest).

5. Use solution-style build just for buildable targets

Your root tsconfig.json references a lot (including tests). You can slim it to only the publishable packages so tsc -b is fast and deterministic:

tsconfig.json

{
"$schema": "https://json.schemastore.org/tsconfig",
"extends": "./tsconfig.base.json",
"files": [],
"references": [
{ "path": "./packages/core" },
{ "path": "./packages/ui" },
{ "path": "./packages/cli" },
{ "path": "./packages/test-utils" },
{ "path": "./packages/php-json-ast" },
{ "path": "./packages/php-driver" }
]
}

Run:

pnpm -w tsx -e "console.log('OK')" # sanity check ESM tools
pnpm -w tsc -b --verbose

6. Kill remaining duplication with a tiny helper

Make scripts/gen-config.mjs to spit out both Jest mappers & (if you ever need) a Rollup/Vite externals list from package.json peers, so you don’t hand-copy it into every config. (You already do some of this in CLI; extend that pattern.)

⸻

Sanity checks after changes

# 1. no more node vs bundler drift

git grep -n '"moduleResolution":' -- '\*_/tsconfig_.json'

# 2. show what jest maps now

node -e "console.log(require('./node_modules/ts-jest').pathsToModuleNameMapper(
require('./tsconfig.base.json').compilerOptions.paths, {prefix:'<rootDir>/'}
))"

# 3. vite resolves TS paths

pnpm --recursive --filter './packages/\*' run build

# 4. repo-wide tests

pnpm test

If you want, I can output minimal diffs for one package (e.g. @wpkernel/ui) as a template you can copy across.
