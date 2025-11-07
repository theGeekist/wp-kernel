[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceDataViewsScreenConfig

# Interface: ResourceDataViewsScreenConfig

Screen configuration for an admin DataViews entry point.

Controls the generated React component, routing, and how the CLI resolves
imports between resource modules, wpk bootstrap, and UI runtime.

All fields are optional; sensible defaults are derived from the resource name.

## Indexable

```ts
[key: string]: unknown
```

## Properties

### component?

```ts
optional component: string;
```

---

### route?

```ts
optional route: string;
```

---

### resourceImport?

```ts
optional resourceImport: string;
```

---

### resourceSymbol?

```ts
optional resourceSymbol: string;
```

---

### wpkernelImport?

```ts
optional wpkernelImport: string;
```

---

### wpkernelSymbol?

```ts
optional wpkernelSymbol: string;
```

---

### menu?

```ts
optional menu: ResourceDataViewsMenuConfig;
```
