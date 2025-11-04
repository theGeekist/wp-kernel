[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ApplyLogRecord

# Interface: ApplyLogRecord

Represents a single record within an apply log entry.

## Properties

### file

```ts
readonly file: string;
```

***

### status

```ts
readonly status: "applied" | "conflict" | "skipped";
```

***

### description?

```ts
readonly optional description: string;
```

***

### details?

```ts
readonly optional details: Record&lt;string, unknown&gt;;
```
