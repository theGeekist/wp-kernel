import { createWpTaxonomyHelperMethods } from '../helpers';
import type { PhpStmt, PhpExprArray } from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../identity';

type TaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

describe('createWpTaxonomyHelperMethods', () => {
	const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
	const storage: TaxonomyStorage = {
		mode: 'wp-taxonomy',
		taxonomy: 'job_category',
		hierarchical: true,
	};

	const resource: IRResource = {
		name: 'jobCategories',
		schemaKey: 'jobCategory',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: ['jobCategories', 'list'], source: 'default' },
			get: { segments: ['jobCategories', 'get'], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: 'taxonomy-resource',
		warnings: [],
	};

	function createHelpers(overrides: Partial<TaxonomyStorage> = {}) {
		return createWpTaxonomyHelperMethods({
			resource: {
				...resource,
				storage: { ...storage, ...overrides },
			},
			pascalName: 'JobCategories',
			identity,
			errorCodeFactory: (suffix) => `taxonomy_${suffix}`,
		});
	}

	it('annotates resolve helper with the identity parameter and nullable WP_Term return type', () => {
		const helpers = createHelpers();

		const resolveHelper = helpers[2];
		expect(resolveHelper.node?.name.name).toBe('resolveJobCategoriesTerm');
		expect(resolveHelper.node?.params).toHaveLength(1);
		expect(resolveHelper.node?.params[0].var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'identity',
		});
		expect(resolveHelper.node?.returnType).toMatchObject({
			nodeType: 'NullableType',
			type: { nodeType: 'Name', parts: ['WP_Term'] },
		});
	});

	it('exposes a typed WP_Term parameter when preparing the taxonomy response', () => {
		const helpers = createHelpers();

		const prepareHelper = helpers[1];
		expect(prepareHelper.node?.name.name).toBe(
			'prepareJobCategoriesTermResponse'
		);
		expect(prepareHelper.node?.params).toHaveLength(1);
		expect(prepareHelper.node?.params[0].type).toMatchObject({
			nodeType: 'Name',
			parts: ['WP_Term'],
		});
		expectHierarchicalFlag(prepareHelper, true);
	});

	it('exposes the identity candidate parameter when validating taxonomy identities', () => {
		const helpers = createHelpers();

		const validateHelper = helpers[3];
		expect(validateHelper.node?.name.name).toBe(
			'validateJobCategoriesIdentity'
		);
		expect(validateHelper.node?.params).toHaveLength(1);
		expect(validateHelper.node?.params[0].var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'value',
		});
		expectFinalReturnTrim(validateHelper);
	});

	it('toggles hierarchical output for non-hierarchical taxonomies', () => {
		const helpers = createHelpers({ hierarchical: false });

		const prepareHelper = helpers[1];
		expectHierarchicalFlag(prepareHelper, false);
	});
});

function expectHierarchicalFlag(
	helper: ReturnType<typeof createHelpers>[number],
	expected: boolean
): void {
	const methodNode = helper.node;
	expect(methodNode).toBeDefined();
	const returnStmt = findReturnStatement(methodNode?.stmts ?? []);
	expect(returnStmt?.expr?.nodeType).toBe('Expr_Array');
	const arrayExpr = returnStmt?.expr as PhpExprArray | undefined;
	const hierarchicalItem = arrayExpr?.items.find((item) => {
		if (!item || !item.key || item.key.nodeType !== 'Scalar_String') {
			return false;
		}
		return item.key.value === 'hierarchical';
	});
	expect(hierarchicalItem?.value?.nodeType).toBe('Expr_ConstFetch');
	const constFetch = hierarchicalItem?.value;
	if (constFetch?.nodeType !== 'Expr_ConstFetch') {
		throw new Error('Expected hierarchical entry to be a const fetch');
	}
	expect(constFetch.name.parts[0]).toBe(expected ? 'true' : 'false');
}

function expectFinalReturnTrim(
	helper: ReturnType<typeof createHelpers>[number]
): void {
	const methodNode = helper.node;
	expect(methodNode).toBeDefined();
	const returnStmt = findReturnStatement(methodNode?.stmts ?? []);
	expect(returnStmt?.expr?.nodeType).toBe('Expr_FuncCall');
	const callExpr = returnStmt?.expr;
	if (!callExpr || callExpr.nodeType !== 'Expr_FuncCall') {
		throw new Error('Expected return expression to be a function call');
	}
	expect(callExpr.name).toMatchObject({ nodeType: 'Name', parts: ['trim'] });
	expect(callExpr.args).toHaveLength(1);
	const [arg] = callExpr.args;
	expect(arg?.value?.nodeType.startsWith('Expr_Cast')).toBe(true);
	const castExpr = arg?.value;
	if (!castExpr || !castExpr.nodeType.startsWith('Expr_Cast')) {
		throw new Error('Expected trim argument to be a cast expression');
	}
	expect((castExpr as { type?: string }).type ?? 'string').toBe('string');
	expect(castExpr.expr).toMatchObject({
		nodeType: 'Expr_Variable',
		name: 'value',
	});
}

function findReturnStatement(
	statements: readonly PhpStmt[]
): Extract<PhpStmt, { nodeType: 'Stmt_Return' }> | undefined {
	return statements.find(
		(
			statement
		): statement is Extract<PhpStmt, { nodeType: 'Stmt_Return' }> =>
			statement.nodeType === 'Stmt_Return'
	);
}
