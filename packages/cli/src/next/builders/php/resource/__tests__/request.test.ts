import { buildRequestParamAssignmentStatement } from '../request';

describe('request helpers', () => {
	it('creates assignments without casts', () => {
		const statement = buildRequestParamAssignmentStatement({
			requestVariable: '$request',
			param: 'slug',
		});

		expect(statement).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'slug' },
				expr: {
					nodeType: 'Expr_MethodCall',
					name: { nodeType: 'Identifier', name: 'get_param' },
				},
			},
		});
	});

	it('creates assignments with casts', () => {
		const statement = buildRequestParamAssignmentStatement({
			requestVariable: 'request',
			targetVariable: 'per_page',
			param: 'per_page',
			cast: 'int',
		});

		expect(statement).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: { nodeType: 'Expr_Cast_Int' },
			},
		});
	});
});
