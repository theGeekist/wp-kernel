[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

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

### preferences

```ts
preferences:
  | DataViewPreferencesRuntime
  | DataViewPreferencesAdapter;
```

The preferences runtime or adapter.

---

### reporter

```ts
reporter: Reporter;
```

The reporter for logging.

---

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntime;
```

The capability runtime.

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
