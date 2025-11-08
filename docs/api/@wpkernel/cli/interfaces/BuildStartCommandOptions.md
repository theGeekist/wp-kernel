[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildStartCommandOptions

# Interface: BuildStartCommandOptions

Options for building the `start` command, allowing for dependency injection.

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

### Commands

#### buildGenerateCommand()?

```ts
readonly optional buildGenerateCommand: (options) => CommandConstructor;
```

Optional: Custom generate command builder function.

Builds the `generate` command for the CLI.

This command is responsible for generating WPKernel artifacts (PHP, TypeScript)
from the `wpk.config.*` configuration files. It processes the configuration,
builds an Intermediate Representation (IR), and uses various builders to
produce the final generated code.

##### Parameters

###### options

[`BuildGenerateCommandOptions`](BuildGenerateCommandOptions.md) = `{}`

Options for building the generate command, including dependencies.

##### Returns

[`CommandConstructor`](../type-aliases/CommandConstructor.md)

The `CommandConstructor` class for the generate command.

### Other

#### loadWatch()?

```ts
readonly optional loadWatch: () => Promise<(paths, options?) => FSWatcher>;
```

Optional: Custom function to load the `chokidar.watch` function.

##### Returns

`Promise`\<(`paths`, `options?`) => `FSWatcher`\>

---

#### adoptCommandEnvironment()?

```ts
readonly optional adoptCommandEnvironment: (source, target) => void;
```

Optional: Custom function to adopt the command environment.

##### Parameters

###### source

`Command`

###### target

`Command`

##### Returns

`void`

---

#### fileSystem?

```ts
readonly optional fileSystem: Partial<FileSystem>;
```

Optional: Partial file system utility functions for testing.

---

#### spawnViteProcess()?

```ts
readonly optional spawnViteProcess: () => ChildProcessWithoutNullStreams;
```

Optional: Custom function to spawn the Vite development server process.

##### Returns

`ChildProcessWithoutNullStreams`
