[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / InvalidateOptions

# Interface: InvalidateOptions

Defined in: [resource/cache.ts:250](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L250)

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Defined in: [resource/cache.ts:255](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L255)

Store key to target (e.g., 'my-plugin/thing')
If not provided, invalidates across all registered stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Defined in: [resource/cache.ts:261](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L261)

Whether to emit the cache.invalidated event

#### Default

```ts
true;
```
