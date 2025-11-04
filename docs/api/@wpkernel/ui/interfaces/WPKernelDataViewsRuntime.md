[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / WPKernelDataViewsRuntime

# Interface: WPKernelDataViewsRuntime

The runtime for DataViews.

## Properties

### registry

```ts
registry: Map & lt;
(string, DataViewRegistryEntry & gt);
```

---

### controllers

```ts
controllers: Map & lt;
(string, unknown & gt);
```

---

### preferences

```ts
preferences: DataViewPreferencesRuntime;
```

---

### events

```ts
events: DataViewsEventEmitter;
```

---

### reporter

```ts
reporter: Reporter;
```

---

### options

```ts
options: NormalizedDataViewsRuntimeOptions;
```

---

### getResourceReporter()

```ts
getResourceReporter: (resource) =&gt; Reporter;
```

#### Parameters

##### resource

`string`

#### Returns

`Reporter`
