[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / ApplyLogRecord

# Interface: ApplyLogRecord

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
