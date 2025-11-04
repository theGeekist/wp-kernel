[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ReporterOptions

# Type Alias: ReporterOptions

```ts
type ReporterOptions = object;
```

## Properties

### namespace?

```ts
optional namespace: string;
```

---

### channel?

```ts
optional channel: ReporterChannel;
```

---

### level?

```ts
optional level: ReporterLevel;
```

---

### enabled?

```ts
optional enabled: boolean;
```

Enables or disables the reporter instance without changing transport configuration.
Primarily used for conditional debug reporters.
