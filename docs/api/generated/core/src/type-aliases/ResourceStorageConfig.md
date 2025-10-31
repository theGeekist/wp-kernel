[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceStorageConfig

# Type Alias: ResourceStorageConfig

```ts
type ResourceStorageConfig =
	| {
			mode: 'transient';
	  }
	| {
			meta?: Record<string, ResourcePostMetaDescriptor>;
			mode: 'wp-post';
			postType?: string;
			statuses?: string[];
			supports?: ('title' | 'editor' | 'excerpt' | 'custom-fields')[];
			taxonomies?: Record<
				string,
				{
					hierarchical?: boolean;
					register?: boolean;
					taxonomy: string;
				}
			>;
	  }
	| {
			hierarchical?: boolean;
			mode: 'wp-taxonomy';
			taxonomy: string;
	  }
	| {
			mode: 'wp-option';
			option: string;
	  };
```

High-level storage configuration for CLI-driven persistence.

The runtime does not consume these properties directly; they exist so resource
definitions remain type-safe when enriched via generators.
