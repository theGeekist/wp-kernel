[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ActionFn

# Type Alias: ActionFn()\&lt;TArgs, TResult\&gt;

```ts
type ActionFn<TArgs, TResult> = (ctx, args) => Promise<TResult>;
```

Function signature for action implementations.

Actions are async functions that receive:

1. **Context** (`ctx`) - Integration surfaces (emit, invalidate, jobs, policy, reporter)
2. **Arguments** (`args`) - Input data provided by the caller

And return a Promise resolving to the action's result.

## Type Parameters

### TArgs

`TArgs`

Input type (arguments passed to the action)

### TResult

`TResult`

Return type (value returned by the action)

## Parameters

### ctx

[`ActionContext`](ActionContext.md)

### args

`TArgs`

## Returns

`Promise`\&lt;`TResult`\&gt;

## Example

```typescript
// Simple action
const CreatePost: ActionFn<CreatePostInput, Post> = async (ctx, input) => {
	const post = await api.posts.create(input);
	ctx.emit('post.created', { postId: post.id });
	ctx.invalidate(['posts']);
	return post;
};
```
