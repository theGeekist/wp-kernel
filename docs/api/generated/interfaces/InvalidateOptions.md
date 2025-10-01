[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / InvalidateOptions

# Interface: InvalidateOptions

Defined in: [invalidate.ts:46](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/invalidate.ts#L46)

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Defined in: [invalidate.ts:51](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/invalidate.ts#L51)

Store key to target (e.g., 'wpk/thing')
If not provided, invalidates across all 'wpk/\*' stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Defined in: [invalidate.ts:57](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/invalidate.ts#L57)

Whether to emit the wpk.cache.invalidated event

#### Default

```ts
true;
```
