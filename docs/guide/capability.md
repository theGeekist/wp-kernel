# Capabilities

Capabilities in WPKernel are a powerful, declarative way to manage user permissions across your entire application. They provide a single source of truth in your `wpk.config.ts` that generates both **server-side enforcement** and **convenient client-side checks**.

This dual nature is what makes the feature so powerful: define a rule once, and WPKernel ensures it's respected on the backend while also making it available to the frontend for building responsive, permission-aware user interfaces.

## The Declarative Approach (in `wpk.config.ts`)

The recommended way to manage permissions is by defining them within a resource in your `wpk.config.ts` file. This approach connects your REST routes directly to your permission rules.

The process has two parts:

1.  **Hinting**: Add a `capability` string to a route.
2.  **Mapping**: Define what that string means in the `capabilities` object.

```ts
// In wpk.config.ts
resources: {
  job: {
    name: 'job',
    routes: {
      list:   { path: '/acme/v1/jobs', method: 'GET',  capability: 'job.list' }, // Hint
      create: { path: '/acme/v1/jobs', method: 'POST', capability: 'job.create'}, // Hint
      update: { path: '/acme/v1/jobs/:id', method: 'PUT', capability: 'job.update'}, // Hint
    },
    capabilities: {
      // Mapping the hints to actual WordPress capabilities
      'job.list': 'read', // Anyone with the 'read' capability can list jobs.
      'job.create': 'edit_posts', // Anyone who can 'edit_posts' can create a job.
      'job.update': {
        capability: 'edit_post', // Note the singular 'post'
        appliesTo: 'object',
      },
    },
  },
},
```

### What `wpk generate` Does

Based on this config, the WPKernel CLI generates two key sets of artifacts:

1.  **Server-Side Enforcement (PHP)**: For each route with a `capability` hint, the generated PHP REST controller gets a `permission_callback`. This callback uses `current_user_can()` to check if the user has the WordPress capability you mapped. If the check fails, the API request is rejected with a 403 Forbidden error. This is your security layer.

2.  **Client-Side Checks (JavaScript)**: The CLI also generates a typed `capabilities` object that you can import into your UI code. This object has methods like `can()` and `assert()` that let you check permissions directly in the browser.

### Using Capabilities in the UI

The generated client-side object allows you to easily build UIs that adapt to the current user's permissions.

```tsx
import { capabilities } from '../.generated/js';
import { Button } from '@wordpress/components';

function CreateJobButton() {
	// Check if the user can perform the 'job.create' action.
	const canCreate = capabilities.can('job.create');

	if (!canCreate) {
		return null; // Or render a disabled button
	}

	return <Button variant="primary">Create New Job</Button>;
}
```

This prevents users from even seeing options they don't have permission to use, creating a cleaner user experience.

### Object vs. Resource Scope

The `appliesTo` property in the `capabilities` map is crucial for meta capabilities that depend on a specific object (like a post).

- `'resource'` (default): The check is general (e.g., `current_user_can('edit_posts')`). Used for actions like creating new items.
- `'object'`: The check is for a specific object (e.g., `current_user_can('edit_post', 123)`). Used for actions like updating or deleting a specific item. WPKernel automatically wires the object ID from the REST route into this check on the server.

## The Programmatic API (`defineCapability`)

For advanced use cases or when defining capabilities outside of a resource context, you can use the [`defineCapability`](/api/@wpkernel/core/functions/defineCapability) function. This is useful if you have complex, dynamic rules or want to share a capability map across different parts of a non-generated, custom application.

```ts
import { defineCapability } from '@wpkernel/core/capability';

type MyCustomCapabilities = {
	'beta.features.enabled': void;
	'special.tool.access': { toolId: string };
};

export const myCustomAcl = defineCapability<MyCustomCapabilities>({
	map: {
		'beta.features.enabled': async ({ adapters }) => {
			// Rule can be async, e.g., checking a remote flag
			return (await adapters.restProbe?.('beta-flag')) ?? false;
		},
		'special.tool.access': (ctx, { toolId }) => {
			// Rule can be synchronous, for example checking against a known value.
			// For user-based checks, you would typically use the `ctx.adapters.wp.canUser` method.
			return toolId === 'super-secret-tool';
		},
	},
});
```

You can then use this object in your custom code: `myCustomAcl.can('beta.features.enabled')`. This programmatic approach does **not** automatically generate server-side enforcement and is intended for client-side use.
