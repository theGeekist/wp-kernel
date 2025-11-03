import {
	buildListForeachStatement,
	buildListItemsInitialiserStatement,
} from '../list';

describe('wpPost list query helpers', () => {
	it('initialises the items array', () => {
		const statement = buildListItemsInitialiserStatement();

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'items' },
				expr: { nodeType: 'Expr_Array', items: [] },
			},
		});
	});

	it('builds the foreach statement with guard and push', () => {
		const foreachNode = buildListForeachStatement({
			pascalName: 'Article',
		});

		expect(foreachNode.nodeType).toBe('Stmt_Foreach');
		expect(foreachNode.expr).toMatchObject({
			nodeType: 'Expr_PropertyFetch',
			var: { nodeType: 'Expr_Variable', name: 'query' },
			name: { nodeType: 'Identifier', name: 'posts' },
		});

		const [assignment, guard, push] = foreachNode.stmts;

		expect(assignment).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: { nodeType: 'Expr_Variable', name: 'post' },
				expr: {
					nodeType: 'Expr_FuncCall',
					name: { parts: ['get_post'] },
				},
			},
		});

		expect(guard).toMatchObject({
			nodeType: 'Stmt_If',
			cond: {
				nodeType: 'Expr_BooleanNot',
				expr: {
					nodeType: 'Expr_Instanceof',
					expr: { nodeType: 'Expr_Variable', name: 'post' },
					class: { parts: ['WP_Post'] },
				},
			},
			stmts: [{ nodeType: 'Stmt_Continue' }],
		});

		expect(push).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: {
					nodeType: 'Expr_ArrayDimFetch',
					var: { nodeType: 'Expr_Variable', name: 'items' },
				},
				expr: {
					nodeType: 'Expr_MethodCall',
					name: {
						nodeType: 'Identifier',
						name: 'prepareArticleResponse',
					},
				},
			},
		});
	});
});
