# Resources

Resources are the core data entities in a WPKernel application. They are the bridge between your WordPress backend and your client-side code, providing a complete, end-to-end stack for creating, reading, updating, and deleting data.

WPKernel offers two primary ways to work with resources, giving you the flexibility to choose the approach that best fits your project's needs.

1.  **Declarative (Config-First)**: Define resources in `wpk.config.ts` to automatically generate PHP REST controllers, admin UIs, and typed client libraries. This is the fastest way to get a full CRUD interface up and running.
2.  **Programmatic (API-First)**: Use the `defineResource` function directly in your TypeScript code to create a client-side resource object. This approach gives you full control when building custom UIs or integrating with existing frontends.

Both approaches yield a powerful, consistent resource object for use in your application.

## Path 1: Declarative via `wpk.config.ts`

When you define a resource in `wpk.config.ts`, you are describing the desired state of your application. WPKernel's CLI reads this configuration and generates the necessary PHP and JavaScript files.

```ts
// In wpk.config.ts
resources: {
  job: {
    name: 'job',
    routes: {
      list:   { path: '/acme/v1/jobs', method: 'GET', capability: 'job.list' },
      get:    { path: '/acme/v1/jobs/:id', method: 'GET', capability: 'job.get' },
    },
    capabilities: {
      'job.list': 'read',
      'job.get':  'read',
    },
    storage: {
        mode: 'wp-post',
        postType: 'job'
    },
    ui: { // This block generates a WordPress Admin UI
        admin: {
            view: 'dataviews',
            dataviews: {
                screen: {
                    route: 'acme-jobs',
                    menu: { slug: 'acme-jobs', title: 'Jobs' }
                }
            }
        }
    }
  },
},
```

**What this generates:**

- **PHP REST Controllers**: Secure endpoints for all defined `routes`.
- **WordPress Admin UI**: A complete admin screen with a data table for your resource, registered as a menu page.
- **Typed Client Object**: A `job` object for your frontend with methods like `fetchList`, `useList`, etc.
- **Capability Enforcement**: Both backend and frontend helpers for the defined capabilities. See the [Capabilities Guide](./capability.md) for details.

This approach is ideal for standard CRUD operations and for quickly scaffolding new features.

## Path 2: Programmatic via `defineResource`

For more custom scenarios, or when you don't need a generated admin UI, you can define a resource directly in your code. This is common when building a custom block editor interface or a bespoke frontend application.

```ts
// In /resources/job.ts
import { defineResource } from '@wpkernel/core/resource';

interface Job {
	id: number;
	title: string;
	status: 'draft' | 'open' | 'closed';
}

type JobQuery = { status?: Job['status']; search?: string };

export const job = defineResource<Job, JobQuery>({
	name: 'job',
	namespace: 'acme-demo', // Manually specify namespace
	routes: {
		list: { path: '/acme/v1/jobs', method: 'GET' },
		get: { path: '/acme/v1/jobs/:id', method: 'GET' },
		create: { path: '/acme/v1/jobs', method: 'POST' },
	},
});
```

**What this provides:**

- A typed `job` object with the same client-side API (`fetchList`, `create`, etc.) as the declarative approach.
- The ability to define and use a resource entirely in your client-side code, assuming the corresponding REST endpoints exist.

::: info Tip
You can even mix and match. Use `wpk.config.ts` to generate the backend PHP controllers, and then use `defineResource` on the client to interact with them in a custom UI.
:::

## Defining Relationships

When your resources are stored as WordPress posts (`mode: 'wp-post'`), you can define relationships with other data using the `meta` and `taxonomies` properties within the `storage` configuration.

### One-to-One and One-to-Many (via Meta)

You can use post meta to store simple values or to create relationships with other resources. For example, a `book` resource might have an `author_id` to link to an author.

```ts
// In wpk.config.ts
resources: {
  book: {
    // ... other resource config
    storage: {
        mode: 'wp-post',
        postType: 'book',
        meta: {
            // Simple value
            status: { type: 'string', single: true },
            // Relationship to another resource
            author_id: { type: 'integer', single: true },
            // One-to-many with simple values
            tags: { type: 'array', single: false },
        }
    },
  },
},
```

In this example:

- `status` is a simple string meta field.
- `author_id` could store the ID of a post from another post type, effectively creating a one-to-one relationship.
- `tags` stores an array of strings, representing a one-to-many relationship with simple values.

### Many-to-Many (via Taxonomies)

For many-to-many relationships, you can use WordPress taxonomies. For example, a `book` can have multiple `genres`, and a `genre` can be applied to multiple books.

```ts
// In wpk.config.ts
resources: {
  book: {
    // ... other resource config
    storage: {
        mode: 'wp-post',
        postType: 'book',
        taxonomies: {
            genres: { taxonomy: 'book_genre' },
        }
    },
  },
},
```

In this configuration:

- `genres` defines a relationship to the `book_genre` taxonomy.
- When fetching a `book`, the response will include an array of term IDs for the `genres`.
- When creating or updating a `book`, you can pass an array of term IDs to associate it with the specified genres.

## Using Resources in a Custom UI

Regardless of how you define it, using a resource in your React components is the same. The resource object provides easy-to-use hooks for data fetching.

```tsx
// In a custom React component
import { job } from '@/resources'; // Your resource, from generated file or manual definition

function MyCustomJobList() {
	const { data, isLoading, error } = job.useList({ status: 'open' });

	if (isLoading) {
		return <p>Loading...</p>;
	}
	if (error) {
		return <p role="alert">{error.message}</p>;
	}

	return (
		<ul>
			{data?.items.map((item) => (
				<li key={item.id}>{item.title}</li>
			))}
		</ul>
	);
}
```

The `useList` hook handles fetching data from your REST endpoint, managing loading and error states, and caching the results in the Redux store.

## What's Next?

- **[WPKernel Config Reference](/reference/wpk-config)**: See all options for generating resources and UIs.
- **[Actions](/guide/actions)**: Learn how to orchestrate write operations using your resources.
- **[DataViews](/guide/dataviews)**: Dive deeper into the generated admin UIs.
