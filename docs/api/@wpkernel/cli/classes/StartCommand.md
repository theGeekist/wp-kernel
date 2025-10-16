[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / StartCommand

# Class: StartCommand

Clipanion command that watches kernel sources, regenerates artifacts, and
launches the Vite dev server for UI development.

## Extends

- `Command`

## Constructors

### Constructor

```ts
new StartCommand(): StartCommand;
```

#### Returns

`StartCommand`

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

### verbose

```ts
verbose: boolean;
```

---

### autoApplyPhp

```ts
autoApplyPhp: boolean;
```

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
