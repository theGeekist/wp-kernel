[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewChangedPayload

# Type Alias: DataViewChangedPayload

```ts
type DataViewChangedPayload = object;
```

Payload for the `viewChanged` event.

## Properties

### resource

```ts
resource: string;
```

---

### viewState

```ts
viewState: object;
```

#### fields

```ts
fields: string[];
```

#### page

```ts
page: number;
```

#### perPage

```ts
perPage: number;
```

#### filters?

```ts
optional filters: Record<string, unknown>;
```

#### search?

```ts
optional search: string;
```

#### sort?

```ts
optional sort: object;
```

##### sort.direction

```ts
direction: 'asc' | 'desc';
```

##### sort.field

```ts
field: string;
```
