[**WP Kernel API v0.5.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / MutableIr

# Interface: MutableIr

## Properties

### meta

```ts
meta:
  | {
  version: 1;
  namespace: string;
  sourcePath: string;
  origin: string;
  sanitizedNamespace: string;
}
  | null;
```

---

### config

```ts
readonly config: KernelConfigV1;
```

---

### schemas

```ts
schemas: IRSchema[];
```

---

### resources

```ts
resources: IRResource[];
```

---

### policies

```ts
policies: IRPolicyHint[];
```

---

### policyMap

```ts
policyMap: IRPolicyMap | null;
```

---

### blocks

```ts
blocks: IRBlock[];
```

---

### php

```ts
php: IRPhpProject | null;
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
