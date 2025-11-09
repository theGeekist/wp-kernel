[**@wpkernel/e2e-utils v0.12.1-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ManifestMutationDefinition

# Type Alias: ManifestMutationDefinition

```ts
type ManifestMutationDefinition =
	| string
	| {
			contents?: string;
			delete?: boolean;
			mode?: number;
	  };
```

Definition for mutating files between manifest comparisons.
