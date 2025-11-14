import type { WPKernelConfigV1 } from '@wpkernel/cli/config/types';

/**
 * WPKernel configuration for your project.
 *
 * This file describes your plugin namespace, shared schemas, REST resources,
 * capabilities, and readiness/adapter hooks. Update it to change what `wpk generate`
 * and `wpk apply` produce.
 *
 * @see https://wpkernel.dev/reference/wpk-config.schema.json
 */
/** @see https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules */
export const wpkConfig: WPKernelConfigV1 = {
	/**
	 * Optional JSON Schema reference so editors can offer autocomplete
	 * and validation when editing this file.
	 */
	$schema: 'https://wpkernel.dev/reference/wpk-config.schema.json',
	/**
	 * Configuration schema version. Keep this set to `1` for the current
	 * WPKernel toolchain.
	 */
	version: 1,
	/**
	 * Short, slug-style identifier for this plugin or feature. Used as a prefix
	 * for PHP namespaces, generated JS store keys, and WordPress capability names.
	 *
	 * @example
	 * namespace: 'jobs',
	 */
	namespace: 'acme-jobs',
	/**
	 * Registry of shared schema descriptors, keyed by a short name. Schemas
	 * typically point to JSON Schema or Zod files and describe the data shapes
	 * your resources reuse.
	 */
	schemas: {
		job: {
			path: './schemas/job.schema.json',
			generated: {
				types: './.generated/types/job.d.ts',
			},
			description: 'Public job listing schema for REST + UI.',
		},
		application: {
			path: './schemas/application.schema.json',
			generated: {
				types: './.generated/types/application.d.ts',
			},
			description: 'Private job application payload and status model.',
		},
		settings: {
			path: './schemas/settings.schema.json',
			generated: {
				types: './.generated/types/settings.d.ts',
			},
			description: 'Plugin settings for retention and notifications.',
		},
	},
	/**
	 * Registry of resource descriptors keyed by identifier. Each resource
	 * represents one domain object (job, booking, menu item, etc.) and drives
	 * REST routes, storage strategy, capabilities, and admin UI.
	 */
	resources: {
		job: {
			name: 'job',
			namespace: 'Acme\\Jobs',
			routes: {
				list: {
					path: '/acme/v1/jobs',
					method: 'GET',
					capability: 'job.list',
				},
				get: {
					path: '/acme/v1/jobs/:id',
					method: 'GET',
					capability: 'job.get',
				},
				create: {
					path: '/acme/v1/jobs',
					method: 'POST',
					capability: 'job.create',
				},
				update: {
					path: '/acme/v1/jobs/:id',
					method: 'PATCH',
					capability: 'job.update',
				},
				remove: {
					path: '/acme/v1/jobs/:id',
					method: 'DELETE',
					capability: 'job.remove',
				},
			},
			identity: {
				type: 'number',
				param: 'id',
			},
			storage: {
				mode: 'wp-post',
				postType: 'acme_job',
				statuses: ['publish', 'draft', 'closed'],
				supports: ['title', 'editor', 'excerpt', 'custom-fields'],
				meta: {
					salary_min: { type: 'number', single: true },
					salary_max: { type: 'number', single: true },
					location: { type: 'string', single: true },
					external_url: { type: 'string', single: true },
				},
				taxonomies: {
					acme_job_department: {
						taxonomy: 'acme_job_department',
						hierarchical: false,
						register: true,
					},
					acme_job_location: {
						taxonomy: 'acme_job_location',
						hierarchical: true,
						register: true,
					},
				},
			},
			schema: 'job',
			capabilities: {
				'job.list': 'read',
				'job.get': 'read',
				'job.create': {
					capability: 'edit_posts',
					appliesTo: 'resource',
				},
				'job.update': {
					capability: 'edit_posts',
					appliesTo: 'object',
					binding: 'id',
				},
				'job.remove': {
					capability: 'delete_posts',
					appliesTo: 'object',
					binding: 'id',
				},
			},
			queryParams: {
				search: {
					type: 'string',
					optional: true,
					description: 'Free text search across title and location.',
				},
				department: {
					type: 'enum',
					enum: ['engineering', 'marketing', 'sales', 'operations'],
					optional: true,
					description: 'Filter jobs by department taxonomy term.',
				},
				location: {
					type: 'enum',
					enum: ['remote', 'onsite', 'hybrid'],
					optional: true,
					description: 'Filter jobs by location model.',
				},
			},
			ui: {
				admin: {
					view: 'dataviews',
					dataviews: {
						fields: [
							{
								key: 'title',
								label: 'Job title',
								component: 'TitleColumn',
							},
							{
								key: 'location',
								label: 'Location',
								component: 'LocationBadge',
							},
							{
								key: 'department',
								label: 'Department',
								component: 'DepartmentBadge',
							},
							{
								key: 'status',
								label: 'Status',
								component: 'StatusPill',
							},
						],
						defaultView: {
							layout: 'table',
							columns: [
								'title',
								'location',
								'department',
								'status',
							],
						},
						actions: [
							{
								key: 'open',
								label: 'Open in editor',
								action: 'openInEditor',
							},
							{
								key: 'archive',
								label: 'Archive job',
								action: 'archiveJob',
							},
						],
						search: true,
						searchLabel: 'Search jobs',
						empty: {
							title: 'No jobs yet',
							description:
								'Create your first job to start hiring.',
						},
						perPageSizes: [10, 25, 50],
						views: [
							{
								id: 'all',
								label: 'All jobs',
								view: { filters: {} },
								description: 'Every job regardless of status.',
								isDefault: true,
							},
							{
								id: 'open',
								label: 'Open roles',
								view: { filters: { status: ['publish'] } },
								description:
									'Jobs currently accepting applications.',
							},
						],
						preferencesKey: 'acme-jobs/dataviews/job',
						interactivity: {
							feature: 'admin-screen',
						},
						screen: {
							component: '@acme/jobs-admin/JobListScreen',
							route: 'acme-jobs',
							resourceImport: '@acme/jobs/resources',
							resourceSymbol: 'job',
							wpkernelImport: '@wpkernel/ui/dataviews',
							wpkernelSymbol: 'createAdminDataViewScreen',
							menu: {
								slug: 'acme-jobs',
								title: 'Jobs',
								capability: 'manage_options',
								parent: 'options-general.php',
								position: 58,
							},
						},
					},
				},
			},
		},
		application: {
			name: 'application',
			namespace: 'Acme\\Jobs',
			routes: {
				list: {
					path: '/acme/v1/applications',
					method: 'GET',
					capability: 'application.list',
				},
				get: {
					path: '/acme/v1/applications/:uuid',
					method: 'GET',
					capability: 'application.get',
				},
				create: {
					path: '/acme/v1/applications',
					method: 'POST',
					capability: 'application.create',
				},
				update: {
					path: '/acme/v1/applications/:uuid',
					method: 'PATCH',
					capability: 'application.update',
				},
			},
			identity: {
				type: 'string',
				param: 'uuid',
			},
			storage: {
				mode: 'wp-post',
				postType: 'acme_application',
				statuses: ['private', 'rejected', 'hired'],
				supports: ['custom-fields'],
				meta: {
					job_id: { type: 'number', single: true },
					cv_attachment_id: { type: 'number', single: true },
					status: { type: 'string', single: true },
				},
				taxonomies: {},
			},
			schema: 'application',
			capabilities: {
				'application.list': {
					capability: 'list_applications',
					appliesTo: 'resource',
				},
				'application.get': {
					capability: 'read_application',
					appliesTo: 'object',
					binding: 'uuid',
				},
				'application.create': 'read',
				'application.update': {
					capability: 'edit_application',
					appliesTo: 'object',
					binding: 'uuid',
				},
			},
			queryParams: {
				status: {
					type: 'enum',
					enum: [
						'new',
						'screening',
						'interview',
						'offer',
						'rejected',
					],
					optional: true,
					description: 'Filter applications by status.',
				},
			},
			ui: {
				admin: {
					view: 'dataviews',
					dataviews: {
						fields: [
							{ key: 'candidate_name', label: 'Candidate' },
							{ key: 'job_title', label: 'Job' },
							{ key: 'status', label: 'Status' },
						],
						defaultView: {
							layout: 'table',
							columns: ['candidate_name', 'job_title', 'status'],
						},
						search: true,
						searchLabel: 'Search applications',
						screen: {
							component: 'ApplicationsAdminScreen',
							route: 'acme-applications',
							resourceImport: '@/resources/application',
							resourceSymbol: 'application',
							wpkernelImport: '@wpkernel/ui/dataviews',
							wpkernelSymbol: 'createAdminDataViewScreen',
						},
					},
				},
			},
		},
	},
	// adapters: {},
	// readiness: {},
};

export type WPKernelConfig = typeof wpkConfig;
