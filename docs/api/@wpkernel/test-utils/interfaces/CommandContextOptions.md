[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CommandContextOptions

# Interface: CommandContextOptions

Options for creating a command context.

## Properties

### cwd?

```ts
optional cwd: string | () => string;
```

The current working directory for the command. Can be a string or a function returning a string.

---

### env?

```ts
optional env: ProcessEnv;
```

The environment variables for the command.

---

### stdin?

```ts
optional stdin: ReadStream;
```

The standard input stream for the command.

---

### colorDepth?

```ts
optional colorDepth: number;
```

The color depth of the terminal.
