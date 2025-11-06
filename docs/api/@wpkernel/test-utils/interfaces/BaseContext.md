[**@wpkernel/test-utils v0.11.0**](../README.md)

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

### stdout

```ts
stdout: MemoryStream;
```

The standard output stream.

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

### env

```ts
env: ProcessEnv;
```

The environment variables for the command.

---

### cwd()

```ts
cwd: () => string;
```

A function that returns the current working directory.

#### Returns

`string`

---

### colorDepth

```ts
colorDepth: number;
```

The color depth of the terminal.
