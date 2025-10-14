# Block Bindings

> **Status**: 🚧 This page will be expanded in Sprint 1+

Bind core WordPress blocks to your store data. No custom blocks needed for read paths.

## Quick Reference

```typescript
import { registerBindingSource } from '@wpkernel/core/bindings';
import { select } from '@wordpress/data';

registerBindingSource('gk', {
	'testimonial.title': (attrs) =>
		select('wpk/testimonial').getById(attrs.id)?.title,
	'testimonial.content': (attrs) =>
		select('wpk/testimonial').getById(attrs.id)?.content,
	'testimonial.rating': (attrs) =>
		select('wpk/testimonial').getById(attrs.id)?.rating,
});
```

In `block.json`:

```json
{
	"bindings": {
		"core/heading": { "content": "gk:testimonial.title" },
		"core/paragraph": { "content": "gk:testimonial.content" }
	}
}
```

## See Also

- [Resources Guide](/guide/resources) - Using resources with bindings
- [WordPress Block Bindings API](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/)
