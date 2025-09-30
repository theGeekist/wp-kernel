# Quick Start

This guide walks you through building your first feature with WP Kernel: a simple "Thing" resource with create functionality.

## Goal

By the end of this guide, you'll have:

- A typed REST resource
- An Action that orchestrates writes
- A UI component that submits data
- Events emitted on success

Time: **~15 minutes**

## Step 1: Define a Resource

Resources define your data contract. Create `app/resources/Thing.ts`:

```typescript
import { defineResource } from '@geekist/wp-kernel/resource';

export interface Thing {
	id: number;
	title: string;
	description: string;
	created_at: string;
}

export const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/gk/v1/things', method: 'GET' },
		get: { path: '/gk/v1/things/:id', method: 'GET' },
		create: { path: '/gk/v1/things', method: 'POST' },
		update: { path: '/gk/v1/things/:id', method: 'PUT' },
		remove: { path: '/gk/v1/things/:id', method: 'DELETE' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
});
```

**What this gives you:**

- Typed client methods: `thing.list()`, `thing.create()`, etc.
- Store selectors: `select('gk/thing').getList()`, `select('gk/thing').getById(id)`
- Cache keys for invalidation
- Automatic retry logic

## Step 2: Create JSON Schema

Create `contracts/thing.schema.json`:

```json
{
	"$schema": "http://json-schema.org/draft-07/schema#",
	"type": "object",
	"properties": {
		"id": { "type": "number" },
		"title": { "type": "string", "minLength": 1, "maxLength": 200 },
		"description": { "type": "string", "maxLength": 1000 },
		"created_at": { "type": "string", "format": "date-time" }
	},
	"required": ["id", "title", "created_at"]
}
```

Generate TypeScript types:

```bash
pnpm types:generate
```

## Step 3: Write an Action

Actions orchestrate writes. Create `app/actions/Thing/Create.ts`:

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { events } from '@geekist/wp-kernel/events';
import { thing } from '@/app/resources/Thing';
import { invalidate } from '@wordpress/data';

export const CreateThing = defineAction(
	'Thing.Create',
	async ({ data }: { data: Partial<Thing> }) => {
		// 1. Call the resource
		const created = await thing.create(data);

		// 2. Emit canonical event
		CreateThing.emit(events.thing.created, {
			id: created.id,
			data: created,
		});

		// 3. Invalidate affected cache keys
		invalidate(['thing', 'list']);

		// 4. Return the result
		return created;
	}
);
```

**What this does:**

- Calls REST endpoint via resource
- Emits `wpk.thing.created` event (canonical)
- Invalidates list cache (triggers refetch)
- Returns created object

## Step 4: Use in a Component

Create a simple form component:

```typescript
import { CreateThing } from '@/app/actions/Thing/Create';
import { useState } from '@wordpress/element';
import { Button, TextControl, Notice } from '@wordpress/components';

export function ThingForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await CreateThing({ data: { title, description } });
      // Success! Clear form
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Notice status="error" isDismissible={false}>{error}</Notice>}

      <TextControl
        label="Title"
        value={title}
        onChange={setTitle}
        required
      />

      <TextControl
        label="Description"
        value={description}
        onChange={setDescription}
      />

      <Button type="submit" variant="primary" isBusy={saving}>
        Create Thing
      </Button>
    </form>
  );
}
```

**Note**: The component calls the Action, not the resource directly. This is enforced by ESLint rules.

## Step 5: Add REST Endpoint (PHP)

Create `includes/rest/class-things-controller.php`:

```php
<?php
namespace Geekist\WPKernel\REST;

class Things_Controller extends \WP_REST_Controller {
    protected $namespace = 'gk/v1';
    protected $rest_base = 'things';

    public function register_routes() {
        register_rest_route( $this->namespace, '/' . $this->rest_base, [
            [
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_items' ],
                'permission_callback' => [ $this, 'get_items_permissions_check' ],
            ],
            [
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create_item' ],
                'permission_callback' => [ $this, 'create_item_permissions_check' ],
                'args'                => $this->get_endpoint_args_for_item_schema(),
            ],
        ] );
    }

    public function get_items_permissions_check( $request ) {
        return current_user_can( 'edit_posts' );
    }

    public function create_item_permissions_check( $request ) {
        return current_user_can( 'edit_posts' );
    }

    public function get_items( $request ) {
        // Your implementation
        return rest_ensure_response( [] );
    }

    public function create_item( $request ) {
        $params = $request->get_json_params();

        // Validate, sanitize, create...
        $thing = [
            'id'          => wp_generate_uuid4(),
            'title'       => sanitize_text_field( $params['title'] ),
            'description' => sanitize_textarea_field( $params['description'] ?? '' ),
            'created_at'  => current_time( 'c' ),
        ];

        return rest_ensure_response( $thing );
    }
}
```

Register in your plugin's main file:

```php
add_action( 'rest_api_init', function() {
    $controller = new \Geekist\WPKernel\REST\Things_Controller();
    $controller->register_routes();
} );
```

## Step 6: Test It

1. **Build**: `pnpm build`
2. **Start WordPress**: `pnpm wp:start`
3. **Open admin**: http://localhost:8888/wp-admin
4. **Test the form**: Submit a new "thing"
5. **Check events**: Open browser console, watch for `wpk.thing.created`

## What You've Learned

✅ **Resources**: One definition → typed client + store + cache  
✅ **Actions**: Orchestrate writes, emit events, invalidate caches  
✅ **Events**: Canonical taxonomy (`wpk.thing.created`)  
✅ **Actions-first**: UI never calls transport directly

## Next Steps

- [Core Concepts](/guide/) - Dive deeper into Resources, Actions, Events
- [Block Bindings](/guide/block-bindings) - Display data in blocks
- [Interactivity](/guide/interactivity) - Add front-end behavior
- [Jobs](/guide/jobs) - Queue background work
