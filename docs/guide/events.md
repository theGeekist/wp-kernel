# Events

> **Status**: 🚧 This page will be expanded in Sprint 1+

Canonical event taxonomy with stable names.

## Quick Reference

```typescript
import { events } from '@geekist/wp-kernel/events';

// ✅ Use canonical events
CreateThing.emit(events.thing.created, { id, data });

// ❌ Never use ad-hoc strings
CreateThing.emit('thing:created', { id }); // Lint error
```

## See Also

- [Event Taxonomy Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)
- [API Reference](/api/events) - Complete API docs (coming soon)
