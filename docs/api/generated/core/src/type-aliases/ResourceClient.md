[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceClient

# Type Alias: ResourceClient\&lt;T, TQuery\&gt;

```ts
type ResourceClient<T, TQuery> = object;
```

Client methods for REST operations

Generated automatically by defineResource based on configured routes.
All methods return Promises with typed responses.

## Type Parameters

### T

`T` = `unknown`

The resource entity type

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations

## Properties

### fetchList()?

```ts
optional fetchList: (query?) => Promise<ListResponse<T>>;
```

Fetch a list of resources

#### Parameters

##### query?

`TQuery`

Query parameters (filters, pagination, etc.)

#### Returns

`Promise`\&lt;[`ListResponse`](ListResponse.md)\&lt;`T`\&gt;\&gt;

Promise resolving to list response

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error

---

### fetch()?

```ts
optional fetch: (id) => Promise<T>;
```

Fetch a single resource by ID

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\&lt;`T`\&gt;

Promise resolving to resource entity

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

---

### create()?

```ts
optional create: (data) => Promise<T>;
```

Create a new resource

#### Parameters

##### data

`Partial`\&lt;`T`\&gt;

Resource data to create

#### Returns

`Promise`\&lt;`T`\&gt;

Promise resolving to created resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including validation errors)

---

### update()?

```ts
optional update: (id, data) => Promise<T>;
```

Update an existing resource

#### Parameters

##### id

Resource identifier

`string` | `number`

##### data

`Partial`\&lt;`T`\&gt;

Partial resource data to update

#### Returns

`Promise`\&lt;`T`\&gt;

Promise resolving to updated resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404, validation errors)

---

### remove()?

```ts
optional remove: (id) => Promise<void | T>;
```

Delete a resource

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\&lt;`void` \| `T`\&gt;

Promise resolving to void or deleted resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

---

### ui?

```ts
optional ui: ResourceUIConfig<T, TQuery>;
```

Optional UI metadata carried over from ResourceConfig.ui.
