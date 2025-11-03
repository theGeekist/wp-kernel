[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / MutableIr

# Interface: MutableIr

## Properties

### blocks

```ts
blocks: IRBlock[];
```

---

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

---

### capabilityMap

```ts
capabilityMap: IRCapabilityMap | null;
```

---

### config

```ts
readonly config: WPKernelConfigV1;
```

---

### diagnostics

```ts
diagnostics: IRDiagnostic[];
```

---

### extensions

```ts
extensions: Record<string, unknown>;
```

---

### meta

```ts
meta:
  | {
  namespace: string;
  origin: string;
  sanitizedNamespace: string;
  sourcePath: string;
  version: 1;
}
  | null;
```

---

### php

```ts
php: IRPhpProject | null;
```

---

### resources

```ts
resources: IRResource[];
```

---

### schemas

```ts
schemas: IRSchema[];
```
