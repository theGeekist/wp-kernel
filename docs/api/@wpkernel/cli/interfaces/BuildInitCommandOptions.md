[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildInitCommandOptions

# Interface: BuildInitCommandOptions

Options for building the `init` command.

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
readonly optional buildReadinessRegistry: (options?) => ReadinessRegistry;
```

Optional: Custom readiness registry builder.

##### Parameters

###### options?

[`BuildDefaultReadinessRegistryOptions`](BuildDefaultReadinessRegistryOptions.md)

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
