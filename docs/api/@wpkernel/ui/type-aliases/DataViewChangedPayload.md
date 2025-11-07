[**@wpkernel/ui v0.12.0**](../README.md)

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

#### sort?

```ts
optional sort: object;
```

##### sort.field

```ts
field: string;
```

##### sort.direction

```ts
direction: 'asc' | 'desc';
```

#### search?

```ts
optional search: string;
```

#### filters?

```ts
optional filters: Record<string, unknown>;
```
