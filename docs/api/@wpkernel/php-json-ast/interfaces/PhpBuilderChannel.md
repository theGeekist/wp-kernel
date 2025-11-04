[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpBuilderChannel

# Interface: PhpBuilderChannel

## Properties

### queue()

```ts
queue: (action) =&gt; void;
```

#### Parameters

##### action

[`PhpProgramAction`](PhpProgramAction.md)

#### Returns

`void`

***

### drain()

```ts
drain: () =&gt; readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]

***

### reset()

```ts
reset: () =&gt; void;
```

#### Returns

`void`

***

### pending()

```ts
pending: () =&gt; readonly PhpProgramAction[];
```

#### Returns

readonly [`PhpProgramAction`](PhpProgramAction.md)[]
