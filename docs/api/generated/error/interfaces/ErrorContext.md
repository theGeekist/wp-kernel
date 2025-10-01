[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [error](../README.md) / ErrorContext

# Interface: ErrorContext

Defined in: [error/types.ts:26](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L26)

Context data that can be attached to any error

## Indexable

```ts
[key: string]: unknown
```

Additional arbitrary data

## Properties

### resourceName?

```ts
optional resourceName: string;
```

Defined in: [error/types.ts:28](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L28)

Resource or action name

---

### actionName?

```ts
optional actionName: string;
```

Defined in: [error/types.ts:29](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L29)

---

### policyKey?

```ts
optional policyKey: string;
```

Defined in: [error/types.ts:30](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L30)

---

### path?

```ts
optional path: string;
```

Defined in: [error/types.ts:33](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L33)

Request details

---

### method?

```ts
optional method: string;
```

Defined in: [error/types.ts:34](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L34)

---

### status?

```ts
optional status: number;
```

Defined in: [error/types.ts:35](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L35)

---

### userId?

```ts
optional userId: number;
```

Defined in: [error/types.ts:38](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L38)

User/environment context

---

### siteId?

```ts
optional siteId: number;
```

Defined in: [error/types.ts:39](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L39)

---

### requestId?

```ts
optional requestId: string;
```

Defined in: [error/types.ts:42](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/error/types.ts#L42)

Correlation ID for tracing
