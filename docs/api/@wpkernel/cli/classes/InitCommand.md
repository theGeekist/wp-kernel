[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / InitCommand

# Class: InitCommand

`wpk init` - initialize a WP Kernel project in the current directory.

## Extends

- `Command`

## Constructors

### Constructor

```ts
new InitCommand(): InitCommand;
```

#### Returns

`InitCommand`

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

### name

```ts
name: string | undefined;
```

---

### template

```ts
template: string | undefined;
```

---

### force

```ts
force: boolean;
```

## Methods

### execute()

```ts
execute(): Promise<number>;
```

Standard function that'll get executed by `Cli#run` and `Cli#runExit`.

Expected to return an exit code or nothing (which Clipanion will treat
as if 0 had been returned).

#### Returns

`Promise`\&lt;`number`\&gt;

#### Overrides

```ts
Command.execute;
```
