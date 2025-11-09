[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

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

### Workspace

#### ensureGeneratedPhpClean()?

```ts
readonly optional ensureGeneratedPhpClean: (options) => Promise<void>;
```

Optional: Custom function to ensure the generated PHP directory is clean.

Ensures that the generated PHP directory is clean (i.e., no uncommitted changes).

This function checks the Git status of the specified directory. If uncommitted
changes are found, it throws a `WPKernelError` unless the `yes` option is true.

##### Parameters

###### options

[`EnsureGeneratedPhpCleanOptions`](EnsureGeneratedPhpCleanOptions.md)

Options for the cleanliness check.

##### Returns

`Promise`\<`void`\>

##### Throws

`WPKernelError` if uncommitted changes are found and `yes` is false.

### Other

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

#### checkPhpEnvironment()?

```ts
readonly optional checkPhpEnvironment: (options) => Promise<DoctorCheckResult[]>;
```

Optional: Custom function to check the PHP environment.

##### Parameters

###### options

[`CheckPhpEnvironmentOptions`](CheckPhpEnvironmentOptions.md)

##### Returns

`Promise`\<[`DoctorCheckResult`](DoctorCheckResult.md)[]\>

---

#### loadWPKernelConfig()?

```ts
readonly optional loadWPKernelConfig: () => Promise<LoadedWPKernelConfig>;
```

Optional: Custom function to load the WPKernel configuration.

Locate and load the project's wpk configuration.

The function searches for supported config files, executes them via
cosmiconfig loaders, validates the resulting structure and performs a
Composer autoload sanity check to ensure PHP namespaces are mapped
correctly.

##### Returns

`Promise`\<[`LoadedWPKernelConfig`](LoadedWPKernelConfig.md)\>

The validated wpk config and associated metadata.

##### Throws

WPKernelError when discovery, parsing or validation fails.
