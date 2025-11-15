[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ApplyLogEntry

# Interface: ApplyLogEntry

Represents a complete entry in the apply log.

## Properties

### actions

```ts
readonly actions: readonly string[];
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

### records

```ts
readonly records: readonly ApplyLogRecord[];
```

---

### status

```ts
readonly status: ApplyLogStatus;
```

---

### summary

```ts
readonly summary: ApplyLogSummary | null;
```

---

### timestamp

```ts
readonly timestamp: string;
```

---

### version

```ts
readonly version: number;
```

---

### error?

```ts
readonly optional error: unknown;
```
