[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / InteractivityModule

# Interface: InteractivityModule

Ambient interface exposed by `@wordpress/interactivity`.

## Extends

- `InteractivityCore`.`Record`\<`string`, `unknown`\>

## Indexable

```ts
[key: string]: unknown
```

## Properties

### store()

```ts
store: (namespace, definition?) => InteractivityStoreResult;
```

#### Parameters

##### namespace

`string`

##### definition?

`Record`\<`string`, `unknown`\>

#### Returns

[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)

#### Inherited from

```ts
InteractivityCore.store;
```

---

### getServerState

```ts
getServerState: InteractivityServerStateResolver;
```

#### Inherited from

```ts
InteractivityCore.getServerState;
```
