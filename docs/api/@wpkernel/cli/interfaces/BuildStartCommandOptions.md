[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / BuildStartCommandOptions

# Interface: BuildStartCommandOptions

Options for building the `start` command, allowing for dependency injection.

## Properties

### Reporter

#### buildReporter()?

```ts
readonly optional buildReporter: (options) =&gt; Reporter;
```

Optional: Custom reporter builder function.

Create a WP Kernel reporter backed by LogLayer transports.

The reporter honors namespace, channel, and level options while providing a
typed interface for child loggers used across subsystems.

##### Parameters

###### options

`ReporterOptions` = `{}`

Reporter configuration

##### Returns

`Reporter`

Reporter instance with child helpers

### Generate Command

#### buildGenerateCommand()?

```ts
readonly optional buildGenerateCommand: (options) =&gt; CommandConstructor;
```

Optional: Custom generate command builder function.

Builds the `generate` command for the CLI.

This command is responsible for generating WP Kernel artifacts (PHP, TypeScript)
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
readonly optional loadWatch: () =&gt; Promise&lt;(paths, options?) =&gt; FSWatcher&gt;;
```

Optional: Custom function to load the `chokidar.watch` function.

##### Returns

`Promise`\&lt;(`paths`, `options?`) =&gt; `FSWatcher`\&gt;

---

#### adoptCommandEnvironment()?

```ts
readonly optional adoptCommandEnvironment: (source, target) =&gt; void;
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
readonly optional fileSystem: Partial&lt;FileSystem&gt;;
```

Optional: Partial file system utility functions for testing.

---

#### spawnViteProcess()?

```ts
readonly optional spawnViteProcess: () =&gt; ChildProcessWithoutNullStreams;
```

Optional: Custom function to spawn the Vite development server process.

##### Returns

`ChildProcessWithoutNullStreams`
