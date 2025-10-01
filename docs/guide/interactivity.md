# Interactivity API

> **Status**: 🚧 This page will be expanded in Sprint 1+

Add front-end behavior to blocks without custom JavaScript.

## Quick Reference

```typescript
import { defineInteraction } from '@geekist/wp-kernel/interactivity';

export const useThingForm = defineInteraction('wpk/thing-form', {
	state: () => ({ saving: false, error: null }),
	actions: {
		async submit(formData) {
			this.state.saving = true;
			try {
				await CreateThing({ data: formData });
			} catch (e) {
				this.state.error = e.message;
			} finally {
				this.state.saving = false;
			}
		},
	},
});
```

## See Also

- [WordPress Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)
