[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsControllerRuntime

# Interface: DataViewsControllerRuntime

Context passed to DataViews controllers for logging and event emission.

## Properties

### registry

```ts
readonly registry: Map&lt;string, unknown&gt;;
```

---

### controllers

```ts
readonly controllers: Map&lt;string, unknown&gt;;
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
