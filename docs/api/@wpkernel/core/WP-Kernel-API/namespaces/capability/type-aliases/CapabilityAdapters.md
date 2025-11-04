[**WP Kernel API v0.11.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [capability](../README.md) / CapabilityAdapters

# Type Alias: CapabilityAdapters

```ts
type CapabilityAdapters = object;
```

## Examples

```typescript
// Using WordPress adapter in capability rule
const capability = defineCapability({
  map: {
    'posts.edit': async (ctx, postId: number) =&gt; {
    // ctx.adapters.wp is auto-injected
    const result = await ctx.adapters.wp?.canUser('update', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  }
});
```

```ts

```

## Properties

### wp?

```ts
optional wp: object;
```

#### canUser()

```ts
canUser: (action, resource) =&gt; boolean | Promise&lt;boolean&gt;;
```

##### Parameters

###### action

`"create"` | `"read"` | `"update"` | `"delete"`

###### resource

\{
`path`: `string`;
\} | \{
`kind`: `"postType"`;
`name`: `string`;
`id?`: `number`;
\}

##### Returns

`boolean` \| `Promise`\&lt;`boolean`\&gt;

---

### restProbe()?

```ts
optional restProbe: (key) =&gt; Promise&lt;boolean&gt;;
```

#### Parameters

##### key

`string`

#### Returns

`Promise`\&lt;`boolean`\&gt;
