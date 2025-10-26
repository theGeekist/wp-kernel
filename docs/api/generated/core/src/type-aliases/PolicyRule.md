[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / PolicyRule

# Type Alias: PolicyRule()\&lt;P\&gt;

```ts
type PolicyRule<P> = (ctx, params) => boolean | Promise<boolean>;
```

Policy rule signature.

Rules can be synchronous (return boolean) or asynchronous (return Promise&lt;boolean&gt;).
Use async rules when checking capabilities requires REST API calls or async operations
(e.g., wp.data.select('core').canUser(), fetch() calls).

The policy runtime automatically caches async rule results to avoid redundant API calls.
Rules receive a PolicyContext with adapters, cache, and reporter for structured evaluation.

## Type Parameters

### P

`P` = `void`

Parameters required by the rule. `void` indicates no params needed.

## Parameters

### ctx

[`PolicyContext`](PolicyContext.md)

### params

`P`

## Returns

`boolean` \| `Promise`\&lt;`boolean`\&gt;

## Example

```typescript
// Synchronous rule (no params)
const viewRule: PolicyRule<void> = (ctx) => {
	return (
		ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ??
		false
	);
};

// Async rule with params
const editRule: PolicyRule<number> = async (ctx, postId) => {
	const result = await ctx.adapters.wp?.canUser('update', {
		kind: 'postType',
		name: 'post',
		id: postId,
	});
	return result ?? false;
};

// Complex params
const assignRule: PolicyRule<{ userId: number; postId: number }> = async (
	ctx,
	params
) => {
	const canEdit = await ctx.adapters.wp?.canUser('update', {
		kind: 'postType',
		name: 'post',
		id: params.postId,
	});
	return canEdit && params.userId > 0;
};
```
