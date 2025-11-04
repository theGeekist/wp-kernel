[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / IRWarning

# Interface: IRWarning

Represents a warning generated during IR processing.

## Properties

### code

```ts
code: string;
```

A unique code for the warning.

***

### message

```ts
message: string;
```

A human-readable warning message.

***

### context?

```ts
optional context: Record&lt;string, unknown&gt;;
```

Optional: Additional context for the warning.
