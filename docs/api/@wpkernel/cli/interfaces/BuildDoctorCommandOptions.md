[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildDoctorCommandOptions

# Interface: BuildDoctorCommandOptions

Options for building the `doctor` command, allowing for dependency injection.

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) => Reporter;
```

Optional: Custom reporter builder function.

Create a CLI reporter with pretty terminal output.

This is the recommended reporter for CLI/Node.js environments. It uses
SimplePrettyTerminalTransport for enhanced formatting with colors and structure.

For browser/WordPress environments, use `createReporter()` from `@wpkernel/core`.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

##### Example

```typescript
import { createReporterCLI } from '@wpkernel/cli/utils/reporter';

const reporter = createReporterCLI({ level: 'debug' });
reporter.info('Starting build process');
```

### Other

#### buildReadinessRegistry()?

```ts
readonly optional buildReadinessRegistry: (options) => ReadinessRegistry;
```

Optional: Custom readiness registry builder.

##### Parameters

###### options

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md) = `{}`

##### Returns

[`ReadinessRegistry`](../classes/ReadinessRegistry.md)

---

#### buildWorkspace()?

```ts
readonly optional buildWorkspace: (root) => Workspace;
```

Optional: Custom workspace builder function.

##### Parameters

###### root

`string` = `...`

##### Returns

[`Workspace`](Workspace.md)

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

Optional: Custom function to load the WPKernel configuration.

Locate and load the project's wpk configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure, and returns the
canonicalised configuration metadata.

##### Returns

`Promise`\<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\>

The validated wpk config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.
