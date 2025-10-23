import type { ResourceControllerMetadata } from '@wpkernel/php-json-ast/types';
import type { ResourceMetadataHost } from '@wpkernel/php-json-ast/factories/cacheMetadata';
import {
	createPaginationNormalisation,
	createQueryArgsAssignment,
	createPageExpression,
	createWpQueryExecution,
} from '../query';
import { renderPhpValue, variable } from '../phpValue';

describe('query helpers', () => {
	it('creates query arg assignments', () => {
		const assignment = createQueryArgsAssignment({
			targetVariable: 'query_args',
			indentLevel: 1,
			entries: [
				{ key: 'post_type', value: variable('post_type') },
				{ key: 'fields', value: 'ids' },
				{
					key: 'paged',
					value: createPageExpression({
						requestVariable: '$request',
					}),
				},
			],
		});

		expect(assignment.lines).toEqual([
			'        $query_args = [',
			"                'post_type' => $post_type,",
			"                'fields' => 'ids',",
			"                'paged' => max( 1, (int) $request->get_param( 'page' ) ),",
			'        ];',
		]);
	});

	it('normalises pagination parameters', () => {
		const [assign, ensurePositive, clamp] = createPaginationNormalisation({
			requestVariable: '$request',
			targetVariable: 'per_page',
			indentLevel: 1,
		});

		expect(assign.lines).toEqual([
			"        $per_page = (int) $request->get_param( 'per_page' );",
		]);
		expect(ensurePositive.lines).toEqual([
			'        if ( $per_page <= 0 ) {',
			'                $per_page = 10;',
			'        }',
		]);
		expect(clamp.lines).toEqual([
			'        if ( $per_page > 100 ) {',
			'                $per_page = 100;',
			'        }',
		]);
	});

	it('creates page expression descriptors', () => {
		const descriptor = createPageExpression({
			requestVariable: '$request',
		});
		const printable = renderPhpValue(descriptor, 0);
		expect(printable.lines).toContain(
			"max( 1, (int) $request->get_param( 'page' ) )"
		);
	});

	it('executes WP_Query and records cache metadata', () => {
		const metadata: ResourceControllerMetadata = {
			kind: 'resource-controller',
			name: 'demo',
			identity: { type: 'number', param: 'id' },
			routes: [],
		};

		const host: ResourceMetadataHost = {
			getMetadata: () => metadata,
			setMetadata: (next) => {
				Object.assign(metadata, next);
			},
		};

		const printable = createWpQueryExecution({
			target: 'query',
			argsVariable: 'args',
			cache: {
				host,
				scope: 'list',
				operation: 'read',
				segments: ['demo'],
			},
		});

		expect(printable.lines).toEqual(['$query = new WP_Query( $args );']);
		expect(metadata.cache?.events).toHaveLength(1);
	});
});
