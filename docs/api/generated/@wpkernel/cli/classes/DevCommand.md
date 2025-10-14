[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / DevCommand

# Class: DevCommand

Temporary alias preserving the legacy `wpk dev` entry point.

## Extends

- [`StartCommand`](StartCommand.md)

## Constructors

### Constructor

```ts
new DevCommand(): DevCommand;
```

#### Returns

`DevCommand`

#### Inherited from

[`StartCommand`](StartCommand.md).[`constructor`](StartCommand.md#constructor)

## Properties

### paths

```ts
static paths: string[][];
```

Paths under which the command should be exposed.

#### Overrides

[`StartCommand`](StartCommand.md).[`paths`](StartCommand.md#paths)

---

### usage

```ts
static usage: Usage;
```

Contains the usage information for the command. If undefined, the
command will be hidden from the general listing.

#### Overrides

[`StartCommand`](StartCommand.md).[`usage`](StartCommand.md#usage)

---

### verbose

```ts
verbose: boolean;
```

#### Inherited from

[`StartCommand`](StartCommand.md).[`verbose`](StartCommand.md#verbose)

---

### autoApplyPhp

```ts
autoApplyPhp: boolean;
```

#### Inherited from

[`StartCommand`](StartCommand.md).[`autoApplyPhp`](StartCommand.md#autoapplyphp)

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

[`StartCommand`](StartCommand.md).[`execute`](StartCommand.md#execute)
