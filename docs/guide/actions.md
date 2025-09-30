# Actions

> **Status**: 🚧 This page will be expanded in Sprint 1+

Actions orchestrate writes. They:
- Call Resources
- Emit Events
- Invalidate cache
- Enqueue Jobs

## Quick Reference

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { events } from '@geekist/wp-kernel/events';
import { invalidate } from '@wordpress/data';

export const CreateThing = defineAction(
  'Thing.Create',
  async ({ data }: { data: Partial<Thing> }) => {
    const created = await thing.create(data);
    CreateThing.emit(events.thing.created, { id: created.id, data });
    invalidate(['thing', 'list']);
    return created;
  }
);
```

## See Also

- [Quick Start](/getting-started/quick-start) - Build your first action
- [API Reference](/api/actions) - Complete API docs (coming soon)
