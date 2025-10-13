import { PhpFileBuilder } from '../../builder';
import type { IRResource } from '../../../../ir';
import { createWpPostHandlers } from '../../wp-post';
import {
	createPrinterContext,
	createRouteDefinitions,
	createRoutes,
} from '../../test-utils/wp-post';

describe('createWpPostHandlers – basic controller generation', () => {
	it('generates CRUD methods and helpers for wp-post resources', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource: IRResource = {
			name: 'job',
			schemaKey: 'job',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/jobs'],
				['GET', '/jobs/:slug'],
				['POST', '/jobs'],
				['PUT', '/jobs/:slug'],
				['DELETE', '/jobs/:slug'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['job', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['job', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['job', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['job', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['job', 'remove']),
					source: 'config',
				},
			},
			identity: { type: 'string', param: 'slug' },
			storage: {
				mode: 'wp-post',
				postType: 'demo_job',
				statuses: ['draft', 'published'],
				supports: ['title', 'editor'],
				meta: {
					status: { type: 'string', single: true },
					tags: { type: 'array', single: false },
				},
				taxonomies: {
					categories: { taxonomy: 'job_category' },
				},
			},
			queryParams: {
				search: {
					type: 'string',
					optional: true,
					description: 'Full text search',
				},
				status: { type: 'enum', enum: ['draft', 'published'] },
			},
			ui: undefined,
			hash: 'resource-job',
			warnings: [],
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: createRouteDefinitions(resource.routes, context),
		});

		for (const method of methods) {
			for (const line of method) {
				builder.appendStatement(line);
			}
		}

		const output = builder.getStatements().join('\n');

		expect(output).toContain('$meta_query = array();');
		expect(output).toContain('$query = new WP_Query( $query_args );');
		expect(output).toContain(
			'$post_id = wp_insert_post( $post_data, true );'
		);
		expect(output).toContain('$this->syncJobMeta( $post_id, $request );');
		expect(output).toContain(
			'$taxonomy_result = $this->syncJobTaxonomies( $post_id, $request );'
		);
		expect(output).toContain("delete_post_meta( $post_id, 'tags' );");
		expect(output).toContain("add_post_meta( $post_id, 'tags', $value );");
		expect(output).toContain('$statuses = $this->getJobStatuses();');
		expect(output).toContain("'post_status' => $statuses");
		expect(output).toContain(
			'private function resolveJobPost( $identity ): ?WP_Post'
		);
		expect(output).not.toContain('if ( is_numeric( $identity ) ) {');
		expect(output).toContain('private function getJobStatuses(): array');
		expect(output).toContain(
			'private function prepareJobResponse( WP_Post $post, WP_REST_Request $request ): array'
		);
		expect(output).toContain("return new WP_Error( 'wpk_job_not_found'");
		expect(output).toContain('$this->syncJobMeta( $post->ID, $request );');
		expect(output).toContain("'deleted' => true");
	});

	it('returns an empty result when storage mode is not wp-post', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'job',
		});

		const resource = {
			name: 'job',
			routes: [],
			storage: { mode: 'wp-option' },
		} as unknown as IRResource;

		const context = createPrinterContext();
		const methods = createWpPostHandlers({
			builder,
			context,
			resource,
			routes: [],
		});

		expect(methods).toEqual([]);
	});
});
