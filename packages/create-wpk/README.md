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

### After Project Creation

The bootstrapper automatically installs `@wpkernel/cli` as a devDependency in your project. This means the `wpk` command is available via your package manager:

```bash
# Run wpk commands directly
wpk generate
wpk doctor
wpk start

# Or via package.json scripts
# Add to your package.json:
{
  "scripts": {
    "generate": "wpk generate",
    "doctor": "wpk doctor",
    "dev": "wpk start"
  }
}
```

The `wpk` binary is installed to `node_modules/.bin/wpk` automatically when npm installs the devDependencies.

## Features

- Forwards positional arguments and `--`-delimited flags into `wpk create`, so `npm create @wpkernel/wpk demo -- --force` behaves the same as running the CLI directly.
- Streams CLI output to the terminal while capturing stdout/stderr buffers for diagnostics.
- Publishes usage telemetry through the wpk reporter under the `wpk.cli.bootstrap` namespace so bootstrap runs align with other CLI events.

## Diagnostics & coverage

The CLI integration suite builds the bootstrap binary on demand (using the package `tsconfig.json`) and executes it with the same `NODE_OPTIONS` loader as the core CLI smoke tests. This ensures the published entry point forwards flags like `--force` without requiring contributors to run `pnpm --filter @wpkernel/create-wpk build` manually before running Jest.
