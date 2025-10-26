[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / GenerateCommand

# Class: GenerateCommand

Clipanion command for generating kernel artifacts.

The command powers `wpk generate`, running printers and emitting summary
metadata back to the invoking context for inspection in tests or higher level
tooling.

## Extends

- `Command`

## Constructors

### Constructor

```ts
new GenerateCommand(): GenerateCommand;
```

#### Returns

`GenerateCommand`

#### Inherited from

```ts
Command.constructor;
```

## Properties

### paths

```ts
static paths: string[][];
```

Paths under which the command should be exposed.

#### Overrides

```ts
Command.paths;
```

---

### usage

```ts
static usage: Usage;
```

Contains the usage information for the command. If undefined, the
command will be hidden from the general listing.

#### Overrides

```ts
Command.usage;
```

---

### dryRun

```ts
dryRun: boolean;
```

---

### verbose

```ts
verbose: boolean;
```

---

### summary?

```ts
optional summary: GenerationSummary;
```

Summary of the last generation run, populated after `execute` completes.

## Methods

### execute()

```ts
execute(): Promise<ExitCode>;
```

Standard function that'll get executed by `Cli#run` and `Cli#runExit`.

Expected to return an exit code or nothing (which Clipanion will treat
as if 0 had been returned).

#### Returns

`Promise`\&lt;`ExitCode`\&gt;

#### Overrides

```ts
Command.execute;
```
