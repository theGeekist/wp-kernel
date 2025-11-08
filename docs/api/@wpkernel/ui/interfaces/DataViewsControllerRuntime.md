[**@wpkernel/ui v0.12.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsControllerRuntime

# Interface: DataViewsControllerRuntime

Context passed to DataViews controllers for logging and event emission.

## Properties

### registry

```ts
readonly registry: Map<string, unknown>;
```

---

### controllers

```ts
readonly controllers: Map<string, unknown>;
```

---

### preferences

```ts
readonly preferences: DataViewPreferencesRuntime;
```

---

### events

```ts
readonly events: DataViewsEventEmitter;
```

---

### reporter

```ts
readonly reporter: Reporter;
```

---

### options

```ts
readonly options: NormalizedDataViewsRuntimeOptions;
```

---

### getResourceReporter()

```ts
readonly getResourceReporter: (resource) => Reporter;
```

#### Parameters

##### resource

`string`

#### Returns

`Reporter`
