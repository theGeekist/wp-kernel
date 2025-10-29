[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / ApplyLogEntry

# Interface: ApplyLogEntry

## Properties

### version

```ts
readonly version: number;
```

---

### timestamp

```ts
readonly timestamp: string;
```

---

### status

```ts
readonly status: ApplyLogStatus;
```

---

### exitCode

```ts
readonly exitCode: number;
```

---

### flags

```ts
readonly flags: ApplyLogFlags;
```

---

### summary

```ts
readonly summary: ApplyLogSummary | null;
```

---

### records

```ts
readonly records: readonly ApplyLogRecord[];
```

---

### actions

```ts
readonly actions: readonly string[];
```

---

### error?

```ts
readonly optional error: unknown;
```
