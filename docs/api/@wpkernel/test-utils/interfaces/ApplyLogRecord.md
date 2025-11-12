[**@wpkernel/test-utils v0.12.1-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ApplyLogRecord

# Interface: ApplyLogRecord

Represents a single record within an apply log entry.

## Properties

### file

```ts
readonly file: string;
```

---

### status

```ts
readonly status: "applied" | "conflict" | "skipped";
```

---

### description?

```ts
readonly optional description: string;
```

---

### details?

```ts
readonly optional details: Record<string, unknown>;
```
