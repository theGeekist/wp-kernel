[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / DefinedAction

# Type Alias: DefinedAction()\&lt;TArgs, TResult\&gt;

```ts
type DefinedAction<TArgs, TResult> = Promise<TResult>;
```

Callable action returned by `defineAction()`.

After wrapping with `defineAction()`, actions become callable functions that:

- Accept only the arguments (context is injected automatically)
- Return a Promise with the action result
- Emit lifecycle events automatically
- Include metadata (actionName, options) as readonly properties

## Example

```typescript
const CreatePost = defineAction({
	name: 'CreatePost',
	handler: async (ctx, input) => {
		// implementation
	},
});

// Usage
const post = await CreatePost({ title: 'Hello', content: '...' });

// Metadata access
console.log(CreatePost.actionName); // "CreatePost"
console.log(CreatePost.options.scope); // "crossTab"
```

## Type Parameters

### TArgs

`TArgs`

Input type (arguments passed to the action)

### TResult

`TResult`

Return type (value returned by the action)

```ts
type DefinedAction(args): Promise<TResult>;
```

Callable action returned by `defineAction()`.

After wrapping with `defineAction()`, actions become callable functions that:

- Accept only the arguments (context is injected automatically)
- Return a Promise with the action result
- Emit lifecycle events automatically
- Include metadata (actionName, options) as readonly properties

## Parameters

### args

`TArgs`

## Returns

`Promise`\&lt;`TResult`\&gt;

## Example

```typescript
const CreatePost = defineAction({
	name: 'CreatePost',
	handler: async (ctx, input) => {
		// implementation
	},
});

// Usage
const post = await CreatePost({ title: 'Hello', content: '...' });

// Metadata access
console.log(CreatePost.actionName); // "CreatePost"
console.log(CreatePost.options.scope); // "crossTab"
```

## Properties

### actionName

```ts
readonly actionName: string;
```

---

### options

```ts
readonly options: ResolvedActionOptions;
```
