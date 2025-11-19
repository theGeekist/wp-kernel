import type { ConfigFieldDescriptor } from '../../.vitepress/theme/components/ConfigAppendix.vue';

export const configFieldIndex: ConfigFieldDescriptor[] = [
	{
		id: 'version',
		path: 'version',
		title: 'Schema version',
		badge: 'required',
		summary:
			'Locks the CLI and builders to a known contract. Current supported version is 1.',
		sections: [
			{ title: 'Accepted values', items: ['1'] },
			{
				title: 'CLI & pipeline',
				items: [
					'Controls feature flags and backward-compat defaults for all builders.',
				],
			},
		],
	},
	{
		id: 'namespace',
		path: 'namespace',
		title: 'Namespace',
		badge: 'required',
		summary:
			'Prefix for PHP class namespaces, REST base paths, capability keys, and generated client names.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'Lowercase kebab-case, e.g. acme-support',
					'Alphanumeric and hyphen',
				],
			},
			{
				title: 'Generated files',
				items: [
					'.generated/php/Rest/<Namespace>Controller.php',
					'.generated/js/resources/<resource>.ts',
					'.generated/js/capabilities.ts',
				],
			},
			{
				title: 'Runtime',
				items: [
					'Used as store key prefixes for React Query adapters.',
					'Drives REST route namespace (`/<namespace>/v1`).',
				],
			},
		],
	},
	{
		id: 'directories',
		path: 'directories',
		title: 'Applied artifact paths',
		badge: 'optional',
		summary:
			'Override where applied artifacts (blocks, controllers, plugin loader) are written relative to the workspace.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'Keys: blocks, blocks.applied, controllers, controllers.applied, plugin, plugin.loader',
					'Values: workspace-relative paths',
				],
			},
			{
				title: 'CLI & pipeline',
				items: [
					'Used by the layout fragment when resolving output targets.',
				],
			},
		],
	},
	{
		id: 'schemas',
		path: 'schemas',
		title: 'Shared schemas',
		badge: 'required',
		summary:
			'Registry of schema descriptors keyed by identifier. Required but may be empty.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'Each entry: { path: string; generated: { types: string }; description? }',
				],
			},
			{
				title: 'CLI & pipeline',
				items: [
					'Loaded into the schema accumulator; drives REST arg validation.',
				],
			},
		],
	},
	{
		id: 'adapters',
		path: 'adapters',
		title: 'Adapter factories',
		badge: 'optional',
		summary:
			'Optional PHP adapter factory and pipeline extensions that customise generated code.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'php: (ctx) => PhpAdapterConfig',
					'extensions: Array<(ctx) => Extension>',
				],
			},
			{
				title: 'CLI & pipeline',
				items: [
					'Factories run during generation to override namespaces, includes, or extend the pipeline.',
				],
			},
		],
	},
	{
		id: 'readiness',
		path: 'readiness',
		title: 'Readiness helpers',
		badge: 'optional',
		summary:
			'Custom readiness helper factories that plug into `wpk doctor` and command preflight checks.',
		sections: [
			{
				title: 'Accepted values',
				items: ['helpers: Array<(ctx) => ReadinessHelper>'],
			},
			{
				title: 'Runtime',
				items: [
					'Consumed by CLI readiness registry; not part of the IR fragments.',
				],
			},
		],
	},
	{
		id: 'resources',
		path: 'resources.*',
		title: 'Resource definition',
		badge: 'optional',
		summary:
			'Declarative description of REST endpoints, capabilities, schemas, and adapters for a single resource.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'name: string',
					'routes: record of { path, method, capability? }',
					'schemas: record of JSON Schema definitions',
					'capabilities: record of map key → WP capability',
				],
			},
			{
				title: 'CLI & pipeline',
				items: [
					'Route planner and PHP builder emit controllers with permission callbacks.',
					'JS builder emits typed clients for each route.',
				],
			},
			{
				title: 'WordPress',
				items: [
					'Registers REST routes under the namespace.',
					'Capability map feeds into permission checks.',
				],
			},
		],
	},
];

export const resourceFields: ConfigFieldDescriptor[] = [
	{
		id: 'resource-name',
		path: 'resources.<key>.name',
		title: 'Name',
		badge: 'required',
		summary:
			'Human-readable name for the resource; influences generated filenames and symbols.',
	},
	{
		id: 'resource-routes',
		path: 'resources.<key>.routes',
		title: 'Routes',
		badge: 'required',
		summary:
			'Partial CRUD route map; each entry defines path, HTTP method, and optional capability.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'list/get/create/update/remove or custom keys',
					'path: string (may include :id/:slug)',
					'method: GET | POST | PUT | PATCH | DELETE',
					'capability?: string',
				],
			},
			{
				title: 'Generated files',
				items: ['REST controllers, typed clients, capability shims.'],
			},
		],
	},
	{
		id: 'resource-identity',
		path: 'resources.<key>.identity',
		title: 'Identity',
		badge: 'optional',
		summary:
			'Controls URL and storage identity: numeric IDs or string keys (slug/uuid).',
		sections: [
			{
				title: 'Accepted values',
				items: [
					"{ type: 'number', param: 'id' }",
					"{ type: 'string', param: 'id' | 'slug' | 'uuid' }",
				],
			},
			{
				title: 'Runtime',
				items: [
					'Enforces ID validation/casting in REST handlers and cache keys.',
				],
			},
		],
	},
	{
		id: 'resource-storage',
		path: 'resources.<key>.storage',
		title: 'Storage',
		badge: 'optional',
		summary:
			'Where WordPress stores the resource: posts, taxonomies, options, or transients.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					"{ mode: 'wp-post', postType, statuses?, supports?, meta?, taxonomies? }",
					"{ mode: 'wp-taxonomy', taxonomy, hierarchical? }",
					"{ mode: 'wp-option', option }",
					"{ mode: 'transient' }",
				],
			},
			{
				title: 'Generated files',
				items: [
					'CRUD helpers, persistence registries, capability hints.',
				],
			},
		],
	},
	{
		id: 'resource-capabilities',
		path: 'resources.<key>.capabilities',
		title: 'Capabilities',
		badge: 'optional',
		summary:
			'Map of operation keys to WordPress capabilities; values can be strings or descriptors.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'key → string capability',
					'or key → { capability: string; appliesTo: "resource" | "object"; binding?: string }',
				],
			},
			{
				title: 'Generated files',
				items: [
					'`.generated/js/capabilities.ts`, PHP capability helper.',
				],
			},
		],
	},
	{
		id: 'resource-queryParams',
		path: 'resources.<key>.queryParams',
		title: 'Query params',
		badge: 'optional',
		summary:
			'Descriptor map for REST query parameters accepted by this resource.',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'name → { type: "string" | "enum"; optional?; enum?; description? }',
				],
			},
			{
				title: 'Runtime',
				items: [
					'Adds REST args validation and documents supported filters.',
				],
			},
		],
	},
	{
		id: 'resource-ui',
		path: 'resources.<key>.ui.admin.dataviews',
		title: 'Admin DataViews',
		badge: 'optional',
		summary:
			'Configuration for generated admin Data Views screens (fields, layouts, saved views, menu).',
		sections: [
			{
				title: 'Accepted values',
				items: [
					'fields?: array<object>',
					'defaultView?: object',
					'actions?: array<object>',
					'search?: boolean; searchLabel?: string',
					'empty?: object | null',
					'perPageSizes?: number[]',
					'defaultLayouts?: record<layout, object|null>',
					'views?: array<{id,label,view,isDefault?,description?}>',
					'preferencesKey?: string',
					'interactivity?: { feature?: string }',
					'screen?: { component?, route?, resourceImport?, resourceSymbol?, wpkernelImport?, wpkernelSymbol?, menu?: { slug, title, capability?, parent?, position? } }',
				],
			},
			{
				title: 'Generated files',
				items: [
					'UI fixtures, registry modules, PHP loader/menu wiring when menu configured.',
				],
			},
		],
	},
];

export const uiFields: ConfigFieldDescriptor[] = [
	{
		id: 'ui-dataviews',
		path: 'resources.<key>.ui.admin.dataviews',
		title: 'DataViews root',
		badge: 'optional',
		summary:
			'Enables generated admin screens using @wpkernel/ui/dataviews.',
	},
	{
		id: 'ui-dataviews-fields',
		path: 'resources.<key>.ui.admin.dataviews.fields',
		title: 'Fields',
		badge: 'optional',
		summary:
			'Array of column/field descriptors for the Data Views table/list.',
	},
	{
		id: 'ui-dataviews-views',
		path: 'resources.<key>.ui.admin.dataviews.views',
		title: 'Saved views',
		badge: 'optional',
		summary:
			'Preset saved views ({id,label,view,isDefault?,description?}).',
	},
	{
		id: 'ui-dataviews-screen',
		path: 'resources.<key>.ui.admin.dataviews.screen',
		title: 'Screen wiring',
		badge: 'optional',
		summary:
			'Low-level wiring for the admin screen: component/module imports, route, and optional menu.',
	},
	{
		id: 'ui-dataviews-menu',
		path: 'resources.<key>.ui.admin.dataviews.screen.menu',
		title: 'Admin menu',
		badge: 'optional',
		summary:
			'WordPress admin menu entry for the screen: { slug, title, capability?, parent?, position? }',
	},
];
