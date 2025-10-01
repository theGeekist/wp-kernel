[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / InvalidateOptions

# Interface: InvalidateOptions

Defined in: [resource/cache.ts:281](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L281)

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Defined in: [resource/cache.ts:286](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L286)

Store key to target (e.g., 'wpk/thing')
If not provided, invalidates across all 'wpk/\*' stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Defined in: [resource/cache.ts:292](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L292)

Whether to emit the wpk.cache.invalidated event

#### Default

```ts
true;
```
