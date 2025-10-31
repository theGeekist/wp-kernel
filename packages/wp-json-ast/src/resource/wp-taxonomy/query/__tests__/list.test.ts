import type { ResolvedIdentity } from '../../../../pipeline/identity';
import { buildWpTaxonomyQueryRouteBundle } from '../buildWpTaxonomyQueryRouteBundle';
import {
	createMetadataHost,
	expectReturnStatement,
	isNewAssignment,
	isVariableAssignment,
} from '../test-support';

describe('buildWpTaxonomyQueryRouteBundle list handler', () => {
	const cacheSegments = ['genre', 'list'] as const;
	const identity: ResolvedIdentity = { type: 'string', param: 'slug' };

	it('builds taxonomy list statements, records cache metadata, and returns items payload', () => {
		const { metadata, host } = createMetadataHost();

		const { routeHandlers } = buildWpTaxonomyQueryRouteBundle({
			pascalName: 'Genre',
			storage: { mode: 'wp-taxonomy', taxonomy: 'genre' },
			resourceName: 'Genre',
			identity,
			errorCodeFactory: (suffix) => `genre_${suffix}`,
		});

		const statements = routeHandlers.list?.({
			metadata: {
				method: 'GET',
				path: '/genres',
				kind: 'list',
				cacheSegments,
			},
			metadataHost: host,
		});

		expect(statements).toBeDefined();
		if (!statements) {
			throw new Error('Expected statements');
		}

		expect(statements.length).toBeGreaterThan(10);
		expect(isVariableAssignment(statements[0], 'taxonomy')).toBe(true);

		const termQuery = statements.find((statement) =>
			isNewAssignment(statement, 'term_query', 'WP_Term_Query')
		);
		expect(termQuery).toBeDefined();

		const countQuery = statements.find((statement) =>
			isNewAssignment(statement, 'count_query', 'WP_Term_Query')
		);
		expect(countQuery).toBeDefined();

		const returnStatement = expectReturnStatement(
			statements[statements.length - 1]
		);
		expect(returnStatement).toMatchObject({
			expr: {
				nodeType: 'Expr_Array',
				items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'items',
						}),
					}),
					expect.objectContaining({
						key: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'total',
						}),
					}),
					expect.objectContaining({
						key: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'pages',
						}),
					}),
				]),
			},
		});

		expect(metadata.cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'list',
					operation: 'read',
					segments: cacheSegments,
				}),
			])
		);
	});
});
