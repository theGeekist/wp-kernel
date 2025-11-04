[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / CommandContextHarness

# Interface: CommandContextHarness

A harness containing the created command context and associated streams.

## Properties

### context

```ts
context: BaseContext;
```

The created command context.

***

### stdout

```ts
stdout: MemoryStream;
```

The `MemoryStream` for standard output.

***

### stderr

```ts
stderr: MemoryStream;
```

The `MemoryStream` for standard error.
