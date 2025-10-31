[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / InteractivityModule

# Interface: InteractivityModule

Ambient interface exposed by `@wordpress/interactivity`.

## Extends

- `InteractivityCore`.`Record`\&lt;`string`, `unknown`\&gt;

## Indexable

```ts
[key: string]: unknown
```

## Properties

### getServerState

```ts
getServerState: InteractivityServerStateResolver;
```

#### Inherited from

```ts
InteractivityCore.getServerState;
```

---

### store()

```ts
store: (namespace, definition?) => InteractivityStoreResult;
```

#### Parameters

##### namespace

`string`

##### definition?

`Record`\&lt;`string`, `unknown`\&gt;

#### Returns

[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)

#### Inherited from

```ts
InteractivityCore.store;
```
