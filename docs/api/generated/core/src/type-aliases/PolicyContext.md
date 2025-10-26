[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / PolicyContext

# Type Alias: PolicyContext

```ts
type PolicyContext = object;
```

Policy evaluation context passed to every rule.

The context provides adapters for capability checking, cache for result storage,
reporter for logging, and namespace for event naming. Rules receive this as their
first parameter and use it to make capability decisions.

## Example

```typescript
const rule: PolicyRule<number> = async (ctx, postId) => {
	// Log evaluation
	ctx.reporter?.debug('Checking edit capability', { postId });

	// Check cached result first
	const cacheKey = `posts.edit::${postId}`;
	const cached = ctx.cache.get(cacheKey);
	if (typeof cached === 'boolean') {
		ctx.reporter?.debug('Cache hit', { result: cached });
		return cached;
	}

	// Use adapter for capability check
	const result =
		(await ctx.adapters.wp?.canUser('update', {
			kind: 'postType',
			name: 'post',
			id: postId,
		})) ?? false;

	ctx.reporter?.info('Capability checked', { postId, result });
	return result;
};
```

## Properties

### namespace

```ts
namespace: string;
```

---

### adapters

```ts
adapters: PolicyAdapters;
```

---

### cache

```ts
cache: PolicyCache;
```

---

### reporter?

```ts
optional reporter: PolicyReporter;
```
