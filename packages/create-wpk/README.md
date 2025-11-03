# @wpkernel/create-wpk

The `@wpkernel/create-wpk` workspace publishes the create bootstrap entry point for the wpk CLI. It shells out to the core `@wpkernel/cli` binary so authors can start a new project without installing the CLI globally.

## Usage

Any package manager that understands the `create` convention can invoke the bootstrapper:

```bash
npm create @wpkernel/wpk
pnpm create @wpkernel/wpk
yarn create @wpkernel/wpk
```

Using `npx`/`pnpm dlx`/`yarn dlx` also works because the published package exposes the `create-wpk` binary.

## Features

- Forwards positional arguments and `--`-delimited flags into `wpk create`, so targets such as `npm create @wpkernel/wpk demo -- --skip-install` behave the same as running the CLI directly.
- Streams CLI output to the terminal while capturing stdout/stderr buffers for diagnostics.
- Publishes usage telemetry through the kernel reporter under the `wpk.cli.bootstrap` namespace so bootstrap runs align with other CLI events.

## Diagnostics & coverage

The CLI integration suite builds the bootstrap binary on demand (using the package `tsconfig.json`) and executes it with the same `NODE_OPTIONS` loader as the core CLI smoke tests. This ensures the published entry point forwards flags like `--skip-install` without requiring contributors to run `pnpm --filter @wpkernel/create-wpk build` manually before running Jest.
