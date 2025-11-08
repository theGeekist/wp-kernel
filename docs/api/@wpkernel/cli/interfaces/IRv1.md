[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRv1

# Interface: IRv1

The top-level Intermediate Representation (IR) for version 1.

## Properties

### meta

```ts
meta: object;
```

Metadata about the IR, including version, namespace, and source information.

#### version

```ts
version: 1;
```

#### namespace

```ts
namespace: string;
```

#### sourcePath

```ts
sourcePath: string;
```

#### origin

```ts
origin: string;
```

#### sanitizedNamespace

```ts
sanitizedNamespace: string;
```

#### features

```ts
features: string[];
```

#### ids

```ts
ids: object;
```

##### ids.algorithm

```ts
algorithm: 'sha256';
```

##### ids.resourcePrefix

```ts
resourcePrefix: 'res:';
```

##### ids.schemaPrefix

```ts
schemaPrefix: 'sch:';
```

##### ids.blockPrefix

```ts
blockPrefix: 'blk:';
```

##### ids.capabilityPrefix

```ts
capabilityPrefix: 'cap:';
```

#### redactions

```ts
redactions: string[];
```

#### limits

```ts
limits: object;
```

##### limits.maxConfigKB

```ts
maxConfigKB: number;
```

##### limits.maxSchemaKB

```ts
maxSchemaKB: number;
```

##### limits.policy

```ts
policy: 'truncate' | 'error';
```

---

### config

```ts
config: WPKernelConfigV1;
```

The original WPKernel configuration.

---

### schemas

```ts
schemas: IRSchema[];
```

An array of schema IRs.

---

### resources

```ts
resources: IRResource[];
```

An array of resource IRs.

---

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

An array of capability hints.

---

### capabilityMap

```ts
capabilityMap: IRCapabilityMap;
```

The capability map IR.

---

### blocks

```ts
blocks: IRBlock[];
```

An array of block IRs.

---

### php

```ts
php: IRPhpProject;
```

The PHP project IR.

---

### diagnostics?

```ts
optional diagnostics: IRDiagnostic[];
```

Optional: An array of diagnostic messages.

---

### adapterAudit?

```ts
optional adapterAudit: IRAdapterAudit;
```

Optional: Adapter change audit trail.

---

### references?

```ts
optional references: IRReferenceSummary;
```

Optional: Cross-reference summary for CI inspection.
