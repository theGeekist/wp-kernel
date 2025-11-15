[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / WPKernelConfigV1

# Interface: WPKernelConfigV1

Shape of a v1 wpk configuration object.

## Properties

### namespace

```ts
namespace: string;
```

---

### resources

```ts
resources: ResourceRegistry;
```

---

### schemas

```ts
schemas: SchemaRegistry;
```

---

### version

```ts
version: 1;
```

---

### $schema?

```ts
optional $schema: string;
```

Optional JSON schema reference to enable IDE validation.

---

### adapters?

```ts
optional adapters: AdaptersConfig;
```

---

### readiness?

```ts
optional readiness: ReadinessConfig;
```
