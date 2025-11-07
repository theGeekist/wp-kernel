### Executive Summary

- **PHP:** A single, comprehensive PHP class named `Capability` is generated. This class is `final` and contains a set of public methods that manage all aspects of capabilities for your application's REST API. This includes a full capability map, a fallback capability, and helper methods to enforce capabilities. This class becomes the single source of truth for capabilities in your WordPress plugin at runtime.
- **JavaScript:** No JavaScript code is generated for capabilities. This is a deliberate architectural decision. The capabilities are enforced on the server-side by the generated PHP `Capability` class. The client-side code interacts with the REST API, and the server is responsible for enforcing the access control. This aligns with the "PHP is a thin contract" philosophy.

### PHP Code Generation in Detail

The PHP code generation is handled by the `@wpkernel/wp-json-ast` package, which is orchestrated by the `wp-kernel` CLI. Here's a breakdown of the generated `Capability` class and its methods:

#### The `Capability` Class

A single file is generated at `src/Generated/Capability/Capability.php` (the path can be customized). This file contains a `final` class named `Capability`.

```
<?php

// ... docblocks ...

namespace MyPlugin\\Generated\\Capability;

// ... use statements ...

final class Capability {
    // ... generated methods ...
}
```

#### Generated Methods (see `docs/internal/discussions/wp.discussion.md`)

The `Capability` class contains the following public static methods:

- **`get_capability_map(): array`**
    - This method returns a static array that contains the complete capability map for your application. This map is generated from the `capabilities` section of your resource definitions in `wpk.config.ts`.
    - The keys of the array are the capability names (e.g., `create_posts`), and the values are the WordPress capabilities required (e.g., `edit_posts`).
- **`get_fallback_capability(): array`**
    - This method returns the fallback capability that is used when a specific capability is not defined in the map. This is also configured in your `wpk.config.ts`.
- **`permission_callback( WP_REST_Request $request ): bool|WP_Error`**
    - This is the method that is directly used as the `permission_callback` for your REST routes. It inspects the incoming `WP_REST_Request`, determines the required capability from the capability map, and checks if the current user has that capability.
    - It will return `true` if the user has the required capability, and a `WP_Error` object if they do not.
- **`enforce( string $capability, WP_REST_Request $request ): bool|WP_Error`**
    - This is a helper method that allows you to enforce a specific capability check at any point in your code. It's used internally by the `permission_callback` but can also be used in your own code for more granular control.
- **`get_definition( string $capability ): ?array`**
    - This method allows you to look up the definition for a specific capability from the map.
- **`get_binding( string $capability ): ?string`**
    - This method returns the WordPress capability that a specific capability is bound to.
- **`create_error( string $capability, WP_REST_Request $request ): WP_Error`**
    - This is a helper method for creating a `WP_Error` object with a consistent error message and code when a capability check fails.

### How `wpk.config.ts` maps to the generated code

The capability keys referenced in your generated PHP Policy class come from the `capability` field on individual routes in your resource definitions. Here's how capabilities are currently configured:

#### Current Implementation: Inline capability maps in resource config

**Single-step approach:** Define capability keys on routes AND map them to WordPress capabilities inline in the same resource:

```typescript
// wpk.config.ts
export const wpkConfig: WPKernelConfigV1 = {
	// ... other config ...
	resources: {
		book: {
			name: 'book',
			schema: 'Book',
			routes: {
				list: {
					path: '/my-plugin/v1/books',
					method: 'GET',
					capability: 'book.list', // ← Capability key
				},
				create: {
					path: '/my-plugin/v1/books',
					method: 'POST',
					capability: 'book.create', // ← Capability key
				},
				get: {
					path: '/my-plugin/v1/books/:id',
					method: 'GET',
					capability: 'book.get', // ← Capability key
				},
				update: {
					path: '/my-plugin/v1/books/:id',
					method: 'PUT',
					capability: 'book.update', // ← Capability key
				},
				remove: {
					path: '/my-plugin/v1/books/:id',
					method: 'DELETE',
					capability: 'book.delete', // ← Capability key
				},
			},
			// Map capability keys → WordPress capabilities inline
			capabilities: {
				'book.list': 'read',
				'book.create': 'edit_posts',
				'book.get': 'read',
				'book.update': 'edit_others_posts',
				'book.delete': 'delete_others_posts',
			},
		},
	},
	// ... other config ...
};
```

**Legacy approach:** You can also use a separate `src/capability-map.{cjs,ts}` file (maintained for backwards compatibility):

```javascript
// src/capability-map.cjs
module.exports = {
	capabilityMap: {
		'book.list': 'read',
		'book.create': 'edit_posts',
		'book.get': 'read',
		'book.update': 'edit_others_posts',
		'book.delete': 'delete_others_posts',
	},
};
```

Or using TypeScript with dynamic resolution:

```typescript
// src/capability-map.ts
export default {
	'book.list': 'read',
	'book.create': 'edit_posts',
	'book.get': async () => ({
		capability: 'edit_others_posts',
		appliesTo: 'object',
		binding: 'id',
	}),
	'book.update': 'edit_others_posts',
	'book.delete': 'delete_others_posts',
};
```

**Precedence:** Inline `capabilities` in resource config take precedence over file-based mappings for that specific resource.

#### How It Works

The system works as follows (verified in `packages/cli/src/ir/shared/capability-map.ts`):

1. CLI collects inline capability maps from `resource.capabilities` fields
2. CLI looks for a `src/capability-map.*` file
3. Inline mappings override file-based mappings for matching keys
4. If neither inline nor file mappings exist, all capabilities fall back to `'manage_options'`

#### Generated PHP

Either way, the configuration generates a `get_capability_map()` method in your Policy class:

```php
// src/Generated/Policy/Policy.php
public static function get_capability_map(): array {
    return [
        'book.list' => 'read',
        'book.create' => 'edit_posts',
        'book.get' => 'read',
        'book.update' => 'edit_others_posts',
        'book.delete' => 'delete_others_posts',
    ];
}
```

**Important:** The capability keys (e.g., `'book.create'`) are defined on routes in `wpk.config.ts`. The mapping to WordPress capabilities (e.g., `'edit_posts'`) can happen either:

1. **Inline** (recommended): In the `capabilities` field of the same resource
2. **Separate file**: In `src/capability-map.{cjs,ts}` (legacy approach)

If you omit both inline and file-based mappings, the generator uses the fallback capability (`'manage_options'`) for all routes.

### Conclusion

The WPKernel's code generation for capabilities is designed to be robust and secure. It centralizes all capability definitions in your `wpk.config.ts` file and generates a single, optimized PHP class that handles all capability checks on the server-side. This approach ensures that your capabilities are consistently enforced and that your client-side code remains decoupled from the specifics of your access control rules.
