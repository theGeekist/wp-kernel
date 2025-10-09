[**WP Kernel API v0.4.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceStorageConfig

# Type Alias: ResourceStorageConfig

```ts
type ResourceStorageConfig =
	| {
			mode: 'transient';
	  }
	| {
			mode: 'wp-post';
			postType?: string;
			statuses?: string[];
			supports?: ('title' | 'editor' | 'excerpt' | 'custom-fields')[];
			meta?: Record<string, ResourcePostMetaDescriptor>;
			taxonomies?: Record<
				string,
				{
					taxonomy: string;
					hierarchical?: boolean;
					register?: boolean;
				}
			>;
	  }
	| {
			mode: 'wp-taxonomy';
			taxonomy: string;
			hierarchical?: boolean;
	  }
	| {
			mode: 'wp-option';
			option: string;
	  };
```

High-level storage configuration for CLI-driven persistence.

The runtime does not consume these properties directly; they exist so resource
definitions remain type-safe when enriched via generators.
