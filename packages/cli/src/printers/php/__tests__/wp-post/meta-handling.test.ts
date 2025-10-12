import { PhpFileBuilder } from '../../builder';
import type { IRResource } from '../../../../ir';
import { createWpPostHandlers } from '../../wp-post';
import {
	createPrinterContext,
	createRouteDefinitions,
	createRoutes,
} from '../../test-utils/wp-post';

describe('createWpPostHandlers – meta handling', () => {
	it('supports numeric identities and complex meta sanitisation', () => {
		const builder = new PhpFileBuilder('Demo\\Namespace\\Rest', {
			kind: 'resource-controller',
			name: 'position',
		});

		const resource: IRResource = {
			name: 'position',
			schemaKey: 'position',
			schemaProvenance: 'manual',
			routes: createRoutes([
				['GET', '/positions'],
				['GET', '/positions/:id'],
				['POST', '/positions'],
				['PUT', '/positions/:id'],
				['DELETE', '/positions/:id'],
			]),
			cacheKeys: {
				list: {
					segments: Object.freeze(['position', 'list']),
					source: 'config',
				},
				get: {
					segments: Object.freeze(['position', 'get', '__wpk_id__']),
					source: 'default',
				},
				create: {
					segments: Object.freeze(['position', 'create']),
					source: 'config',
				},
				update: {
					segments: Object.freeze(['position', 'update']),
					source: 'config',
				},
				remove: {
					segments: Object.freeze(['position', 'remove']),
					source: 'config',
				},
			},
			identity: undefined,
			storage: {
				mode: 'wp-post',
				postType: 'demo_position',
				supports: ['title', 'editor', 'excerpt'],
				meta: {
					is_active: { type: 'boolean', single: true },
					priority: { type: 'integer', single: true },
					rating: { type: 'number', single: true },
					settings: { type: 'object', single: true },
					labels: { type: 'string', single: false },
				},
			},
			queryParams: {},
			ui: undefined,
			hash: 'resource-position',
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

		expect(output).toContain("$request->get_param( 'id' )");
		expect(output).toContain('rest_sanitize_boolean( $is_activeMeta )');
		expect(output).toContain(
			'is_numeric( $priorityMeta ) ? (int) $priorityMeta : 0;'
		);
		expect(output).toContain(
			'is_numeric( $ratingMeta ) ? (float) $ratingMeta : 0.0;'
		);
		expect(output).toContain(
			'is_array( $settingsMeta ) ? $settingsMeta : array();'
		);
		expect(output).toContain(
			'$labelsMeta = array_values( (array) $labelsMeta );'
		);
		expect(output).toContain(
			'foreach ( $labelsMeta as $meta_index => $meta_value ) {'
		);
		expect(output).toContain(
			'$meta_value = is_string( $meta_value ) ? $meta_value : (string) $meta_value;'
		);
		expect(output).toContain('$labelsMeta[ $meta_index ] = $meta_value;');
		expect(output).toContain("$post_data['post_excerpt'] = $excerpt;");
	});
});
