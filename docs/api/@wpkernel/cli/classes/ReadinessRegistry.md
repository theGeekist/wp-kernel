[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ReadinessRegistry

# Class: ReadinessRegistry

## Constructors

### Constructor

```ts
new ReadinessRegistry(): ReadinessRegistry;
```

#### Returns

`ReadinessRegistry`

## Methods

### plan()

```ts
plan(keys): ReadinessPlan;
```

#### Parameters

##### keys

readonly [`ReadinessKey`](../type-aliases/ReadinessKey.md)[]

#### Returns

[`ReadinessPlan`](../interfaces/ReadinessPlan.md)

---

### register()

```ts
register<State>(helper): void;
```

#### Type Parameters

##### State

`State`

#### Parameters

##### helper

[`ReadinessHelper`](../interfaces/ReadinessHelper.md)\<`State`\>

#### Returns

`void`
