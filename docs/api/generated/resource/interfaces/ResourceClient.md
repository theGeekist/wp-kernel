[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceClient

# Interface: ResourceClient\<T, TQuery\>

Defined in: [resource/types.ts:207](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L207)

Client methods for REST operations

Generated automatically by defineResource based on configured routes.
All methods return Promises with typed responses.

## Extended by

- [`ResourceObject`](ResourceObject.md)

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

Defined in: [resource/types.ts:216](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L216)

Fetch a list of resources

#### Parameters

##### query?

`TQuery`

Query parameters (filters, pagination, etc.)

#### Returns

`Promise`\<[`ListResponse`](ListResponse.md)\<`T`\>\>

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

Defined in: [resource/types.ts:226](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L226)

Fetch a single resource by ID

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\<`T`\>

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

Defined in: [resource/types.ts:236](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L236)

Create a new resource

#### Parameters

##### data

`Partial`\<`T`\>

Resource data to create

#### Returns

`Promise`\<`T`\>

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

Defined in: [resource/types.ts:247](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L247)

Update an existing resource

#### Parameters

##### id

Resource identifier

`string` | `number`

##### data

`Partial`\<`T`\>

Partial resource data to update

#### Returns

`Promise`\<`T`\>

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

Defined in: [resource/types.ts:257](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L257)

Delete a resource

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\<`void` \| `T`\>

Promise resolving to void or deleted resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)
