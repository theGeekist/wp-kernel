[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewPreferencesRuntime

# Interface: DataViewPreferencesRuntime

Runtime for managing DataViews preferences

Wraps a preferences adapter with convenience methods for components.
Created via createPreferencesRuntime function.

## Properties

### adapter

```ts
adapter: DataViewPreferencesAdapter;
```

The underlying preferences adapter

---

### get()

```ts
get: (key) => Promise & lt;
unknown & gt;
```

Retrieve a preference value

#### Parameters

##### key

`string`

Preference key

#### Returns

`Promise`\&lt;`unknown`\&gt;

Preference value or undefined

---

### set()

```ts
set: (key, value) => Promise&lt;void&gt;;
```

Persist a preference value

#### Parameters

##### key

`string`

Preference key

##### value

`unknown`

Preference value

#### Returns

`Promise`\&lt;`void`\&gt;

---

### getScopeOrder()

```ts
getScopeOrder: () => DataViewPreferenceScope[];
```

Get the preference scope resolution order

#### Returns

[`DataViewPreferenceScope`](../type-aliases/DataViewPreferenceScope.md)[]

Array of scopes in priority order
