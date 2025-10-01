# Actions

> **Status**: 🚧 This page will be expanded in Sprint 1+

Actions orchestrate writes. They:

- Call Resources (write operations)
- Emit Events (for extensibility)
- Invalidate cache (keep UI fresh)
- Enqueue Jobs (background work)

**Golden Rule**: UI components **never** call resource write methods directly. Always route through Actions.

## Quick Reference

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { testimonial } from '@/resources/Testimonial';
import { events } from '@geekist/wp-kernel/events';

export const CreateTestimonial = defineAction(
	'Testimonial.Create',
	async ({ data }: { data: Partial<TestimonialPost> }) => {
		// Permission check
		if (!currentUserCan('create_testimonials')) {
			throw new PolicyDenied('testimonials.create');
		}

		// Call resource
		const created = await testimonial.create(data);

		// Emit event
		CreateTestimonial.emit(events.testimonial.created, {
			id: created.id,
			data: created,
		});

		// Invalidate cache
		testimonial.invalidate([['testimonial', 'list']]);

		// Queue job if needed
		if (data.featured) {
			await jobs.enqueue('NotifyFeaturedTestimonial', { id: created.id });
		}

		return created;
	}
);
```

## See Also

- [Resources Guide](/guide/resources) - Using resources in actions
- [Events Guide](/guide/events) - Event emission patterns
- [Quick Start](/getting-started/quick-start) - Build your first action
- [API Reference](/api/actions) - Complete API docs (coming soon)
