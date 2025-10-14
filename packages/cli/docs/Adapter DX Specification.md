# Adapter DX Specification

**Goal:** let adapters extend generated output safely and ergonomically, without ever touching raw ASTs. Provide high-level “recipes”, deterministic merge points, optional analysis helpers, and tooling to scaffold/test adapters.

---

## Versioning & Contracts

- **recipesVersion:** `1` - exposed on the builder context so adapters can branch on future recipe changes.
- **No raw AST:** AST stays internal to printers. Adapters only use **recipes** and named **slots**.
- **Write boundaries:** Only code within `WPK:BEGIN AUTO … WPK:END AUTO` may be overwritten by the CLI.

---

## 1. Adapter Entry Point & Recipe API

Adapters implement a friendly interface-no AST access required.

```ts
export interface PhpAdapter {
	name: string;
	/**
	 * Optional precedence. Lower runs earlier. Default = 100.
	 * Final write order: core printers → adapters (asc by `order`, then by `name`) → project-local adapter.
	 */
	order?: number;

	setup?(ctx: AdapterContext): void | Promise<void>;
	transformIR?(ir: IRv1, ctx: AdapterContext): IRv1 | void;
	customise?(
		builder: PhpRecipeBuilder,
		ctx: AdapterContext & { ir: IRv1; recipesVersion: 1 }
	): void;
}
```

**Typing & Unions**

The Recipe API is IR-typed to prevent typos:

- `builder.controller(name: IRv1['resources'][number]['classNames']['controller'])`
- Method unions: `'get_item' | 'create_item' | 'update_item' | 'delete_item' | 'get_items'`
- Resource keys: union of `IRv1['resources'][number]['name']`

This enforces compile-time correctness for common verbs like `.permission.for(method, …)` and `restArgs.extend(resource, …)`.

The `PhpRecipeBuilder` exposes domain verbs:

```ts
builder.namespace.use('WP_REST_Request');

builder.registration.ensurePostType('wpk_job', {
	supports: ['title', 'editor', 'custom-fields'],
});

builder
	.controller('JobsController')
	.permission.for('get_item', { policy: 'jobs.read', objectParam: '$id' })
	.errors.wrap('get_item', { transport: 'wpk' })
	.method('get_item')
	.before('$id = $this->resolveId($request);');

builder.restArgs.extend('job', {
	status: { type: 'string', enum: ['draft', 'publish', 'closed'] },
});

builder.batch.enableFor('job');

// Additional built-ins
builder.registration.ensureTaxonomy('wpk_department', { hierarchical: false });
builder.registration.ensurePostStatus('closed', {
	public: false,
	exclude_from_search: true,
	show_in_admin_all_list: true,
	show_in_admin_status_list: true,
	label_count: ['Closed (%s)', 'Closed (%s)'],
});

builder.namespace.use('WP_Error', { as: 'WPError' }); // de-duped, alias supported
builder.controller('JobsController').helpers.add(
	'resolveId',
	`
/** Resolve slug or id from request. */
protected function resolveId( WP_REST_Request $request ) {
	// …
}
`
);
```

Internally we still use AST transforms, but adapters only touch recipes.

---

## 2. Deterministic “Slots” in Generated PHP

Generated files declare named insertion points inside guarded regions.

```php
// WPK:BEGIN AUTO
// WPK:SLOT imports
// WPK:SLOT helpers
// WPK:SLOT JobsController.get_item.before
// WPK:SLOT JobsController.get_item.after
// WPK:SLOT JobsController.get_item.around
// WPK:END AUTO
```

**Slot grammar**

- Controller slots: `ControllerName.method.phase` where `phase ∈ { before | after | around }`
- File-level slots: `imports`, `helpers`
- Resource-scoped helpers: `Resource.<resourceName>.helpers`

Printers may introduce new slots; they are documented in the auto-generated Slot Reference. Adapters should target known slots only.

---

### REST Args & Persistence Array Recipes

Phase 05C replaced the `json_decode('…', true)` wrappers in generated controllers and registries with native PHP arrays. The core printers now emit native structures instead of strings:

```php
public function get_rest_args(): array
{
        return [
                'status' => [
                        'schema' => [
                                'enum' => ['draft', 'publish', 'closed'],
                                'type' => 'string',
                        ],
                        'required' => true,
                ],
        ];
}
```

```php
public static function get_config(): array
{
        return [
                'resources' => [
                        'job' => [
                                'storage' => [
                                        'supports' => ['title', 'editor'],
                                ],
                        ],
                ],
        ];
}
```

Adapters should extend these arrays via the recipe helpers rather than post-processing PHP strings:

```ts
builder.restArgs.extend('job', {
	status: {
		required: true,
		schema: { enum: ['draft', 'publish', 'archived'], type: 'string' },
	},
});

builder.registration.ensurePostType('wpk_job', {
	statuses: ['archived'],
	supports: ['title', 'editor', 'thumbnail'],
});
```

The helpers merge into the native arrays before formatting, so adapters receive stable PHP output without touching `json_decode` payloads or manual PHP concatenation.

---

## 3. Optional Read-Only Analysis (No Patching)

When an adapter needs to inspect existing PHP (e.g., a custom controller), expose a CLI command:

```
wpk analyze-php inc/Rest/JobsController.php --json > .wpk/analysis/JobsController.json
```

**Analyzer output (versioned)**

```json
{
	"analysisVersion": 1,
	"file": "inc/Rest/JobsController.php",
	"phpVersion": "8.2",
	"hash": "sha256:…",
	"classes": [
		{
			"name": "JobsController",
			"methods": [
				{ "name": "get_item", "params": ["$request"], "docblock": "…" }
			]
		}
	],
	"slots": ["imports", "helpers", "JobsController.get_item.before"]
}
```

_Analysis is advisory only; printers still write exclusively inside WPK slots._

We use `glayzzle/php-parser` to return a JSON description:

- class/method signatures, docblocks
- existing permission callbacks
- helper functions
- presence/location of WPK slots

Adapters can **inspect** this to decide which recipes to apply; they still emit into generated slots. No rewriting of user PHP.

---

## 4. Adapter Capabilities Levels

1. **IR transforms (safest):** `transformIR` tweaks routes, storage, policies before printers run.
2. **Recipe customisations (default):** use builder verbs to inject policies, error wrappers, batch routes, REST args, etc.
3. **Escape hatch (rare):** constrained `insertRaw` into named slots; formatted via Prettier. Log warnings when used.

Constraints:

- `insertRaw` is restricted to slot phases (`before`, `after`, `around`) and cannot introduce `<?php` open tags.
- Snippets are sanitized and always formatted via Prettier(php).
- The builder ensures idempotency (duplicate raw inserts are de-duped per slot).
- A `warn`-level reporter message is emitted whenever `insertRaw` is used.

No adapter ever manipulates low-level AST nodes directly.

---

## 5. Tooling & Developer Workflow

- `wpk adapter scaffold my-company`
    - creates `packages/adapters/my-company/index.ts` with `customise(builder, ctx)` stub
    - seeds a minimal **fixture IR**, a **golden snapshot test** (`.generated/php/**`), and a **playground.ts** to run generate+apply locally
- `wpk adapter test my-company`
    - runs printers with the adapter against fixtures, then **Prettier(php)**, **php -l**, and **snapshot compare**
- Documentation includes a **Quickstart (top 5 recipes)** and an **auto-generated Slot Reference** from printers
- All adapter writes are staged to a temp dir and moved atomically; on errors, no partial outputs are written

---

## 6. Merge & Conflict Strategy

- **Order & priority:** core printer → adapters sorted by `order` (asc) then `name` (asc) → project-local adapter
- **De-dupe:** each slot statement is normalized (trimmed, comment/whitespace-insensitive) and hashed; exact duplicates are removed
- **Conflicts:** if two adapters emit incompatible content into the same slot, fail with:
    - the **slot name**,
    - the **adapter names**,
    - a **unified diff** of the conflicting chunks  
      Exit code: **3 (adapter failure)**.
- **Atomic writes:** printers write to a temp directory and swap into place on success only

---

## 7. Built-in Recipes & Semantics

### Permission recipes

- `permission.for(method, { policy, objectParam? })` - generates a permission callback; idempotent if already present
- `permission.applyMatrix(resource, matrix)` - apply CRUD→cap mapping in one call

### Error recipes

- `errors.wrap(method, { transport: 'wpk' })` - wrap a single method
- `errors.wrapAll({ transport: 'wpk' })` - wrap common methods (`get_item`, `get_items`, `create_item`, `update_item`, `delete_item`) idempotently

### REST args

- `restArgs.extend(resource, fragment)` - **deep merge** objects; arrays **replace**; type mismatches **error**

### Batch endpoints

- `batch.enableFor(resource)` - emits `POST /<resource>/batch` accepting `{ ids: (string|number)[] }`; idempotent across multiple calls and adapters

### Registration helpers

- `registration.ensurePostType`, `registration.ensureTaxonomy`, `registration.ensurePostStatus` - safe merges with de-duped imports

### Namespace & Helpers

- `namespace.use(symbol, { as? })` - de-duped import with optional alias
- `controller(name).helpers.add(helperName, code)` - adds a reusable helper method, de-duped by signature

---

## 8. Example Adapter (Recipe-Only)

```ts
import type { PhpAdapter } from '@wpkernel/cli';

export const myCompanyAdapter: PhpAdapter = {
	name: 'my-company',
	customise(builder, { ir }) {
		for (const resource of ir.resources) {
			const controller = builder.controller(
				`${resource.classNames.controller}`
			);

			controller.permission.for('get_item', {
				policy: `${resource.name}.read`,
				objectParam: '$id',
			});

			controller.errors.wrap('get_item', { transport: 'wpk' });
		}

		for (const resource of ir.resources) {
			if (resource.storage?.mode === 'wp-post') {
				builder.batch.enableFor(resource.name);
			}
		}

		for (const resource of ir.resources) {
			if (resource.schemaProvenance === 'auto') {
				builder.restArgs.extend(resource.name, {
					updated_at: { type: 'string', format: 'date-time' },
				});
			}
		}
	},
};
```

Adapters stay expressive, composable, and safe.
