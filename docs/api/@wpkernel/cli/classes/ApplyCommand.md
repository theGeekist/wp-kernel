[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / ApplyCommand

# Class: ApplyCommand

## Extends

- `Command`

## Constructors

### Constructor

```ts
new ApplyCommand(): ApplyCommand;
```

#### Returns

`ApplyCommand`

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

### yes

```ts
yes: boolean;
```

---

### backup

```ts
backup: boolean;
```

---

### force

```ts
force: boolean;
```

---

### summary

```ts
summary: ApplySummary | null = null;
```

---

### phpSummary

```ts
phpSummary: ApplySummary | null = null;
```

---

### blockSummary

```ts
blockSummary: ApplySummary | null = null;
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
