[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildCreateCommandOptions

# Interface: BuildCreateCommandOptions

Options for building the `create` command.

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

#### runWorkflow()?

```ts
readonly optional runWorkflow: (__namedParameters) => Promise<InitWorkflowResult>;
```

Optional: Custom workflow runner function.

##### Parameters

###### \_\_namedParameters

[`InitWorkflowOptions`](InitWorkflowOptions.md)

##### Returns

`Promise`\<[`InitWorkflowResult`](InitWorkflowResult.md)\>

---

#### checkGitRepository()?

```ts
readonly optional checkGitRepository: (cwd, __namedParameters) => Promise<boolean>;
```

Optional: Custom git repository checker function.

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

[`GitDependencies`](GitDependencies.md) = `{}`

##### Returns

`Promise`\<`boolean`\>

---

#### initGitRepository()?

```ts
readonly optional initGitRepository: (cwd, __namedParameters) => Promise<void>;
```

Optional: Custom git repository initializer function.

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

[`GitDependencies`](GitDependencies.md) = `{}`

##### Returns

`Promise`\<`void`\>

---

#### installNodeDependencies()?

```ts
readonly optional installNodeDependencies: (cwd, __namedParameters) => Promise<void>;
```

Optional: Custom Node.js dependency installer function.

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

##### Returns

`Promise`\<`void`\>

---

#### installComposerDependencies()?

```ts
readonly optional installComposerDependencies: (cwd, __namedParameters) => Promise<void>;
```

Optional: Custom Composer dependency installer function.

##### Parameters

###### cwd

`string`

###### \_\_namedParameters

[`InstallerDependencies`](InstallerDependencies.md) = `{}`

##### Returns

`Promise`\<`void`\>

### Workspace Utilities

#### ensureCleanDirectory()?

```ts
readonly optional ensureCleanDirectory: (options) => Promise<void>;
```

Optional: Custom clean directory enforcer function.

Ensures that a given directory is clean (empty) or creates it if it doesn't exist.

If the directory exists and is not empty, it will throw a `WPKernelError`
unless `force` is true, in which case it will clear the directory contents.

##### Parameters

###### options

[`EnsureCleanDirectoryOptions`](EnsureCleanDirectoryOptions.md)

Options for ensuring the directory is clean.

##### Returns

`Promise`\<`void`\>

##### Throws

`WPKernelError` if the directory is not empty and `force` is false, or if it's not a directory.
