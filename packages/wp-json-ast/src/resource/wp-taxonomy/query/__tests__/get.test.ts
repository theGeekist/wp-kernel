import { buildWpTaxonomyGetRouteStatements } from '../get';
import type { ResolvedIdentity } from '../../../../pipeline/identity';
import {
	createMetadataHost,
	expectMethodCall,
	expectReturnStatement,
	isVariableAssignment,
} from '../test-support';

describe('buildWpTaxonomyGetRouteStatements', () => {
	const cacheSegments = ['genre', 'get'] as const;
	const identity: ResolvedIdentity = { type: 'string', param: 'slug' };

	it('builds taxonomy get statements, records cache metadata, and returns prepared response', () => {
		const { metadata, host } = createMetadataHost();

		const statements = buildWpTaxonomyGetRouteStatements({
			pascalName: 'Genre',
			identity,
			errorCodeFactory: (suffix) => `genre_${suffix}`,
			metadataHost: host,
			cacheSegments,
			storage: { mode: 'wp-taxonomy', taxonomy: 'genre' },
			resourceName: 'Genre',
		});

		expect(statements).toHaveLength(8);
		expect(isVariableAssignment(statements[0], 'identity')).toBe(true);
		expect(statements[1]?.nodeType).toBe('Stmt_If');
		expect(statements[2]?.nodeType).toBe('Stmt_Nop');
		expect(isVariableAssignment(statements[3], 'term')).toBe(true);
		expect(statements[5]).toMatchObject({
			nodeType: 'Stmt_If',
			cond: {
				nodeType: 'Expr_BooleanNot',
			},
		});

		const returnStatement = expectReturnStatement(statements[7]);
		const methodCall = expectMethodCall(
			returnStatement,
			'prepareGenreTermResponse'
		);
		expect(methodCall.args).toHaveLength(1);

		expect(metadata.cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'get',
					operation: 'read',
					segments: cacheSegments,
				}),
			])
		);
	});
});
