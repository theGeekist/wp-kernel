[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ApplyLogEntry

# Interface: ApplyLogEntry

Represents a complete entry in the apply log.

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
