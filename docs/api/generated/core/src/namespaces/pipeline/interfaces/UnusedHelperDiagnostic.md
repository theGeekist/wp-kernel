[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### type

```ts
readonly type: "unused-helper";
```

---

### key

```ts
readonly key: string;
```

---

### message

```ts
readonly message: string;
```

---

### kind?

```ts
readonly optional kind: TKind;
```

---

### helper?

```ts
readonly optional helper: string;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```
