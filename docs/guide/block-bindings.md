# Block Bindings

> **Status**: 🚧 This page will be expanded in Sprint 1+

Bind core WordPress blocks to your store data.

## Quick Reference

```typescript
import { registerBindingSource } from '@geekist/wp-kernel/bindings';
import { select } from '@wordpress/data';

registerBindingSource('gk', {
	'thing.title': (attrs) => select('gk/thing').getById(attrs.id)?.title,
	'thing.price': (attrs) => select('gk/thing').getById(attrs.id)?.price,
});
```

In `block.json`:

```json
{
	"bindings": {
		"core/heading": { "content": "gk:thing.title" },
		"core/paragraph": { "content": "gk:thing.price" }
	}
}
```

## See Also

- [WordPress Block Bindings API](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/)
