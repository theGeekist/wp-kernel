[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / MutableIr

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

***

### config

```ts
readonly config: WPKernelConfigV1;
```

***

### schemas

```ts
schemas: IRSchema[];
```

***

### resources

```ts
resources: IRResource[];
```

***

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

***

### capabilityMap

```ts
capabilityMap: IRCapabilityMap | null;
```

***

### blocks

```ts
blocks: IRBlock[];
```

***

### php

```ts
php: IRPhpProject | null;
```

***

### diagnostics

```ts
diagnostics: IRDiagnostic[];
```

***

### extensions

```ts
extensions: Record&lt;string, unknown&gt;;
```
