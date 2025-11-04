[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ResourceDataViewConfig

# Interface: ResourceDataViewConfig\&lt;TItem, TQuery\&gt;

Resource DataView configuration.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### fields

```ts
fields: Field&lt;TItem&gt;[];
```

***

### defaultView

```ts
defaultView: View;
```

***

### mapQuery

```ts
mapQuery: QueryMapping&lt;TQuery&gt;;
```

***

### actions?

```ts
optional actions: ResourceDataViewActionConfig&lt;TItem, unknown, unknown&gt;[];
```

***

### search?

```ts
optional search: boolean;
```

***

### searchLabel?

```ts
optional searchLabel: string;
```

***

### getItemId()?

```ts
optional getItemId: (item) =&gt; string;
```

#### Parameters

##### item

`TItem`

#### Returns

`string`

***

### empty?

```ts
optional empty: ReactNode;
```

***

### perPageSizes?

```ts
optional perPageSizes: number[];
```

***

### defaultLayouts?

```ts
optional defaultLayouts: Record&lt;string, unknown&gt;;
```

***

### views?

```ts
optional views: ResourceDataViewSavedView[];
```

***

### screen?

```ts
optional screen: ResourceDataViewsScreenConfig;
```
