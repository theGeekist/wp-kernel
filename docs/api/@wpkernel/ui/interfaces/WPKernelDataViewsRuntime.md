[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / WPKernelDataViewsRuntime

# Interface: WPKernelDataViewsRuntime

The runtime for DataViews.

## Properties

### controllers

```ts
controllers: Map<string, unknown>;
```

---

### events

```ts
events: DataViewsEventEmitter;
```

---

### getResourceReporter()

```ts
getResourceReporter: (resource) => Reporter;
```

#### Parameters

##### resource

`string`

#### Returns

`Reporter`

---

### options

```ts
options: NormalizedDataViewsRuntimeOptions;
```

---

### preferences

```ts
preferences: DataViewPreferencesRuntime;
```

---

### registry

```ts
registry: Map<string, DataViewRegistryEntry>;
```

---

### reporter

```ts
reporter: Reporter;
```
