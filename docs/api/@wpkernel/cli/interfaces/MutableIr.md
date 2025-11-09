[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / MutableIr

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
  features: string[];
  ids: {
     algorithm: "sha256";
     blockPrefix: "blk:";
     capabilityPrefix: "cap:";
     resourcePrefix: "res:";
     schemaPrefix: "sch:";
  };
  limits: {
     maxConfigKB: number;
     maxSchemaKB: number;
     policy: "truncate" | "error";
  };
  namespace: string;
  origin: string;
  redactions: string[];
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

### references

```ts
references: IRReferenceSummary | null;
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
