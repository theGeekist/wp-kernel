[**@wpkernel/ui v0.12.3-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsControllerRuntime

# Interface: DataViewsControllerRuntime

Context passed to DataViews controllers for logging and event emission.

## Properties

### controllers

```ts
readonly controllers: Map<string, unknown>;
```

---

### events

```ts
readonly events: DataViewsEventEmitter;
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

---

### options

```ts
readonly options: NormalizedDataViewsRuntimeOptions;
```

---

### preferences

```ts
readonly preferences: DataViewPreferencesRuntime;
```

---

### registry

```ts
readonly registry: Map<string, unknown>;
```

---

### reporter

```ts
readonly reporter: Reporter;
```
