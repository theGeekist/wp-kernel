[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / invokeAction

# Function: invokeAction()

```ts
function invokeAction<TArgs, TResult>(
	action,
	args,
	meta
): ActionEnvelope<TArgs, TResult>;
```

Create an action envelope for dispatching a kernel action through Redux.

This function wraps a kernel action and its arguments in a Redux-compatible format
that the action middleware can intercept and execute. The resulting envelope can be
passed to `store.dispatch()` just like any standard Redux action.

## Why Use Envelopes?

- **Redux Integration**: Enables actions to flow through existing Redux middleware chains
- **Type Safety**: Preserves TypeScript types for arguments and return values
- **Metadata**: Allows attaching middleware coordination data (correlation IDs, etc.)
- **Compatibility**: Works alongside standard Redux actions without interference

## Type Parameters

### TArgs

`TArgs`

Input type for the action

### TResult

`TResult`

Return type from the action

## Parameters

### action

[`DefinedAction`](../type-aliases/DefinedAction.md)\&lt;`TArgs`, `TResult`\&gt;

The defined kernel action to execute

### args

`TArgs`

Arguments to pass to the action function

### meta

`Record`\&lt;`string`, `unknown`\&gt; = `{}`

Optional metadata for middleware coordination

## Returns

[`ActionEnvelope`](../namespaces/actions/type-aliases/ActionEnvelope.md)\&lt;`TArgs`, `TResult`\&gt;

Action envelope ready for Redux dispatch

## Example

```typescript
import { invokeAction } from '@geekist/wp-kernel';
import { CreatePost } from './actions/CreatePost';

// Basic usage
const envelope = invokeAction(CreatePost, {
	title: 'My First Post',
	content: 'Hello world!',
});
const post = await store.dispatch(envelope);

// With metadata
const envelope = invokeAction(
	CreatePost,
	{ title: 'Post', content: '...' },
	{ correlationId: 'req-123', source: 'editor-ui' }
);
const post = await store.dispatch(envelope);
```
