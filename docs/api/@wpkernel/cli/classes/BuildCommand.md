[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / BuildCommand

# Class: BuildCommand

## Extends

- `Command`

## Constructors

### Constructor

```ts
new BuildCommand(): BuildCommand;
```

#### Returns

`BuildCommand`

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

### noApply

```ts
noApply: boolean;
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
