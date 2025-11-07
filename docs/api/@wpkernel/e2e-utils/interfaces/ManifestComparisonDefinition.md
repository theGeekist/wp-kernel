[**@wpkernel/e2e-utils v0.12.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ManifestComparisonDefinition

# Interface: ManifestComparisonDefinition

Specification for before/after manifest comparisons.

## Properties

### before

```ts
before: Record & lt;
(string, ManifestFileDefinition & gt);
```

---

### after

```ts
after: Record & lt;
(string, ManifestMutationDefinition & gt);
```

---

### ignore?

```ts
optional ignore: (string | RegExp)[];
```
