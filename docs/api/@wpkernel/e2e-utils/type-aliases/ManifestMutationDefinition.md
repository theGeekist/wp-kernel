[**@wpkernel/e2e-utils v0.12.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ManifestMutationDefinition

# Type Alias: ManifestMutationDefinition

```ts
type ManifestMutationDefinition =
	| string
	| {
			contents?: string;
			mode?: number;
			delete?: boolean;
	  };
```

Definition for mutating files between manifest comparisons.
