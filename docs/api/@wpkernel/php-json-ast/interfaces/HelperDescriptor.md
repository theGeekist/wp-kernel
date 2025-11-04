[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / HelperDescriptor

# Interface: HelperDescriptor\&lt;TKind\&gt;

## Extended by

- [`Helper`](Helper.md)

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### key

```ts
readonly key: string;
```

---

### kind

```ts
readonly kind: TKind;
```

---

### mode

```ts
readonly mode: HelperMode;
```

---

### priority

```ts
readonly priority: number;
```

---

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

---

### origin?

```ts
readonly optional origin: string;
```
