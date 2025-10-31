[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceIdentityConfig

# Type Alias: ResourceIdentityConfig

```ts
type ResourceIdentityConfig =
	| {
			param?: 'id';
			type: 'number';
	  }
	| {
			param?: 'id' | 'slug' | 'uuid';
			type: 'string';
	  };
```

Identifier configuration for CLI-generated helpers.

Runtime ignores this by default but accepts the fields so configs remain compatible.
