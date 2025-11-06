[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsRuntimeOptions

# Interface: DataViewsRuntimeOptions

Options for creating a `DataViewsStandaloneRuntime`.

## Properties

### namespace

```ts
namespace: string;
```

The namespace of the project.

---

### reporter

```ts
reporter: Reporter;
```

The reporter for logging.

---

### preferences

```ts
preferences:
  | DataViewPreferencesRuntime
  | DataViewPreferencesAdapter;
```

The preferences runtime or adapter.

---

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntime;
```

The capability runtime.

---

### invalidate()?

```ts
optional invalidate: (patterns) => void;
```

A function to invalidate cache entries.

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

#### Returns

`void`

---

### emit()?

```ts
optional emit: (eventName, payload) => void;
```

A function to emit events.

#### Parameters

##### eventName

`string`

##### payload

`unknown`

#### Returns

`void`
