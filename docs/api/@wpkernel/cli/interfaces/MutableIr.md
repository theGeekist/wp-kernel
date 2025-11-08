[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / MutableIr

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
  features: string[];
  ids: {
     algorithm: "sha256";
     resourcePrefix: "res:";
     schemaPrefix: "sch:";
     blockPrefix: "blk:";
     capabilityPrefix: "cap:";
  };
  redactions: string[];
  limits: {
     maxConfigKB: number;
     maxSchemaKB: number;
     policy: "truncate" | "error";
  };
}
  | null;
```

---

### config

```ts
readonly config: WPKernelConfigV1;
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

### references

```ts
references: IRReferenceSummary | null;
```

---

### extensions

```ts
extensions: Record & lt;
(string, unknown & gt);
```
