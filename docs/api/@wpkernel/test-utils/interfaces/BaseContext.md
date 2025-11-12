[**@wpkernel/test-utils v0.12.1-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / BaseContext

# Interface: BaseContext

Base interface for a command execution context.

## Indexable

```ts
[key: string]: unknown
```

Additional properties for the context.

## Properties

### colorDepth

```ts
colorDepth: number;
```

The color depth of the terminal.

---

### cwd()

```ts
cwd: () => string;
```

A function that returns the current working directory.

#### Returns

`string`

---

### env

```ts
env: ProcessEnv;
```

The environment variables for the command.

---

### stderr

```ts
stderr: MemoryStream;
```

The standard error stream.

---

### stdin

```ts
stdin: ReadStream;
```

The standard input stream.

---

### stdout

```ts
stdout: MemoryStream;
```

The standard output stream.
