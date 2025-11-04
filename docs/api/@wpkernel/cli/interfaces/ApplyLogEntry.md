[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ApplyLogEntry

# Interface: ApplyLogEntry

Represents an entry in the apply log.

## Properties

### version

```ts
readonly version: 1;
```

***

### timestamp

```ts
readonly timestamp: string;
```

***

### status

```ts
readonly status: ApplyLogStatus;
```

***

### exitCode

```ts
readonly exitCode: WPKExitCode;
```

***

### flags

```ts
readonly flags: ApplyFlags;
```

***

### summary

```ts
readonly summary: PatchManifestSummary | null;
```

***

### records

```ts
readonly records: readonly PatchRecord[];
```

***

### actions

```ts
readonly actions: readonly string[];
```

***

### error?

```ts
readonly optional error: SerializedError;
```
