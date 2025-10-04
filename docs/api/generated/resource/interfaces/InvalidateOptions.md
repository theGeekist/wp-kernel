[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / InvalidateOptions

# Interface: InvalidateOptions

Defined in: [resource/cache.ts:476](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L476)

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Defined in: [resource/cache.ts:481](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L481)

Store key to target (e.g., 'my-plugin/thing')
If not provided, invalidates across all registered stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Defined in: [resource/cache.ts:487](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L487)

Whether to emit the cache.invalidated event

#### Default

```ts
true;
```
