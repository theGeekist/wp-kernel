[**@wpkernel/ui v0.12.3-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewPreferencesAdapter

# Interface: DataViewPreferencesAdapter

Adapter for persisting DataViews preferences

Abstracts the underlying storage mechanism (typically WordPress core/preferences).
Implementations should handle scope-based preference resolution.

## Example

```typescript
const adapter: DataViewPreferencesAdapter = {
	async get(key) {
		// Resolve from user → role → site scopes
		return await resolveFromScopes(key);
	},
	async set(key, value) {
		// Persist to primary scope (typically user)
		await persistToUserScope(key, value);
	},
	getScopeOrder() {
		return ['user', 'role', 'site'];
	},
};
```

## Properties

### get()

```ts
get: (key) => Promise<unknown>;
```

Retrieve a preference value by key

Should resolve from scopes in order (user → role → site by default).

#### Parameters

##### key

`string`

Preference key (e.g., 'job-listings')

#### Returns

`Promise`<`unknown`>

Preference value or undefined if not found

---

### set()

```ts
set: (key, value) => Promise<void>;
```

Persist a preference value

Should write to the primary scope (typically 'user').

#### Parameters

##### key

`string`

Preference key

##### value

`unknown`

Preference value to persist

#### Returns

`Promise`<`void`>

---

### getScopeOrder()?

```ts
optional getScopeOrder: () => DataViewPreferenceScope[];
```

Get the preference scope resolution order

#### Returns

[`DataViewPreferenceScope`](../type-aliases/DataViewPreferenceScope.md)[]

Array of scopes in priority order (e.g., ['user', 'role', 'site'])
