[**@wpkernel/e2e-utils v0.12.1-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / ManifestFileDefinition

# Type Alias: ManifestFileDefinition

```ts
type ManifestFileDefinition =
	| string
	| {
			contents: string;
			mode?: number;
	  };
```

Definition for seeding files before collecting a manifest snapshot.
