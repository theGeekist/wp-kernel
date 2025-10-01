# Events

> **Status**: 🚧 This page will be expanded in Sprint 1+

Canonical event taxonomy with stable names.

JS hooks are canonical; PHP bridge mirrors selected events only.

## Quick Reference

```typescript
import { events } from '@geekist/wp-kernel/events';

// ✅ Use canonical events from registry
CreateTestimonial.emit(events.testimonial.created, { id, data });

// ❌ Never use ad-hoc strings
CreateTestimonial.emit('testimonial:created', { id }); // Lint error
```

## See Also

- [Event Taxonomy Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)
- [Actions Guide](/guide/actions) - Emitting events from actions
- [API Reference](/api/events) - Complete API docs (coming soon)
