[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-cli](../README.md) / DoctorCommand

# Class: DoctorCommand

`wpk doctor` - run quick health checks on a workspace.

The real implementation will verify environment, composer/autoload,
and other common failure modes. Currently a placeholder that prints a
diagnostic summary when executed.

## Extends

- `Command`

## Constructors

### Constructor

```ts
new DoctorCommand(): DoctorCommand;
```

#### Returns

`DoctorCommand`

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

## Methods

### execute()

```ts
execute(): Promise<number | void>;
```

Standard function that'll get executed by `Cli#run` and `Cli#runExit`.

Expected to return an exit code or nothing (which Clipanion will treat
as if 0 had been returned).

#### Returns

`Promise`\&lt;`number` \| `void`\&gt;

#### Overrides

```ts
Command.execute;
```
