[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / FragmentOutput

# Interface: FragmentOutput

Output for a fragment helper.

## Properties

### draft

```ts
readonly draft: MutableIr;
```

The mutable Intermediate Representation draft.

---

### assign()

```ts
assign: (partial) => void;
```

Assigns a partial `MutableIr` to the current draft.

#### Parameters

##### partial

`Partial`\&lt;[`MutableIr`](MutableIr.md)\&gt;

The partial IR to assign.

#### Returns

`void`
