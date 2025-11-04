[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / IRv1

# Interface: IRv1

The top-level Intermediate Representation (IR) for version 1.

This interface encapsulates all the processed metadata and configurations
of a WP Kernel project, providing a structured representation that can be
used by code generators and other tools.

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

***

### config

```ts
config: WPKernelConfigV1;
```

The original WP Kernel configuration.

***

### schemas

```ts
schemas: IRSchema[];
```

An array of schema IRs.

***

### resources

```ts
resources: IRResource[];
```

An array of resource IRs.

***

### capabilities

```ts
capabilities: IRCapabilityHint[];
```

An array of capability hints.

***

### capabilityMap

```ts
capabilityMap: IRCapabilityMap;
```

The capability map IR.

***

### blocks

```ts
blocks: IRBlock[];
```

An array of block IRs.

***

### php

```ts
php: IRPhpProject;
```

The PHP project IR.

***

### diagnostics?

```ts
optional diagnostics: IRDiagnostic[];
```

Optional: An array of diagnostic messages.
