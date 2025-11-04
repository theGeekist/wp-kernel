[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ResourceIdentityConfig

# Type Alias: ResourceIdentityConfig

```ts
type ResourceIdentityConfig =
	| {
			type: 'number';
			param?: 'id';
	  }
	| {
			type: 'string';
			param?: 'id' | 'slug' | 'uuid';
	  };
```

Identifier configuration for CLI-generated helpers.

Runtime ignores this by default but accepts the fields so configs remain compatible.
