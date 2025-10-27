import { buildWpTaxonomyHelperMethods } from '../helpers';
import type {
	PhpStmt,
	PhpExpr,
	PhpExprArray,
	PhpExprConstFetch,
	PhpExprFuncCall,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../ir/publicTypes';
import type { ResolvedIdentity } from '../../../identity';
import type { ResourceIdentityConfig } from '@wpkernel/core/resource';

type TaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

type TaxonomyHelper = ReturnType<typeof buildWpTaxonomyHelperMethods>[number];

describe('buildWpTaxonomyHelperMethods', () => {
	const identityConfig: ResourceIdentityConfig = {
		type: 'string',
		param: 'slug',
	};
	const identity: ResolvedIdentity = {
		type: 'string',
		param: identityConfig.param ?? 'slug',
	};
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
		identity: identityConfig,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: 'taxonomy-resource',
		warnings: [],
	};

	function buildHelpers(overrides: Partial<TaxonomyStorage> = {}) {
		return buildWpTaxonomyHelperMethods({
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
		const helpers = buildHelpers();

		const resolveHelper = getHelper(helpers, 2);
		expect(resolveHelper.node?.name.name).toBe('resolveJobCategoriesTerm');
		const resolveParams = resolveHelper.node?.params ?? [];
		expect(resolveParams).toHaveLength(1);
		const [resolveIdentityParam] = resolveParams;
		expect(resolveIdentityParam?.var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'identity',
		});
		expect(resolveHelper.node?.returnType).toMatchObject({
			nodeType: 'NullableType',
			type: { nodeType: 'Name', parts: ['WP_Term'] },
		});
	});

	it('exposes a typed WP_Term parameter when preparing the taxonomy response', () => {
		const helpers = buildHelpers();

		const prepareHelper = getHelper(helpers, 1);
		expect(prepareHelper.node?.name.name).toBe(
			'prepareJobCategoriesTermResponse'
		);
		const prepareParams = prepareHelper.node?.params ?? [];
		expect(prepareParams).toHaveLength(1);
		const [prepareParam] = prepareParams;
		expect(prepareParam?.type).toMatchObject({
			nodeType: 'Name',
			parts: ['WP_Term'],
		});
		expectHierarchicalFlag(prepareHelper, true);
	});

	it('extracts taxonomy term arguments from the request', () => {
		const helpers = buildHelpers();

		const extractHelper = getHelper(helpers, 3);
		expect(extractHelper.node?.name.name).toBe(
			'extractJobCategoriesTermArgs'
		);
		const extractParams = extractHelper.node?.params ?? [];
		expect(extractParams).toHaveLength(1);
		const [extractParam] = extractParams;
		expect(extractParam?.type).toMatchObject({
			nodeType: 'Name',
			parts: ['WP_REST_Request'],
		});

		const stmts = extractHelper.node?.stmts ?? [];
		const slugIf = findIfStatement(stmts, 'Expr_BinaryOp_BooleanAnd');
		const assignStmt = expectExpressionStatement(slugIf?.stmts?.[0]);
		const assignExpr = expectAssignExpression(assignStmt.expr);
		const callExpr = assignExpr.expr;
		if (callExpr.nodeType !== 'Expr_FuncCall') {
			throw new Error('Expected slug sanitiser to be a function call');
		}
		expect(callExpr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: { parts: ['sanitize_title'] },
		});

		const returnStmt = findReturnStatement(stmts);
		expect(returnStmt?.expr).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'args',
		});
	});

	it('exposes the identity candidate parameter when validating taxonomy identities', () => {
		const helpers = buildHelpers();

		const validateHelper = getHelper(helpers, 4);
		expect(validateHelper.node?.name.name).toBe(
			'validateJobCategoriesIdentity'
		);
		const validateParams = validateHelper.node?.params ?? [];
		expect(validateParams).toHaveLength(1);
		const [validateParam] = validateParams;
		expect(validateParam?.var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'value',
		});
		expectFinalReturnTrim(validateHelper);
	});

	it('toggles hierarchical output for non-hierarchical taxonomies', () => {
		const helpers = buildHelpers({ hierarchical: false });

		const prepareHelper = getHelper(helpers, 1);
		expectHierarchicalFlag(prepareHelper, false);
	});
});

function getHelper(
	helpers: readonly TaxonomyHelper[],
	index: number
): TaxonomyHelper {
	const helper = helpers[index];
	if (!helper) {
		throw new Error(`Expected helper at index ${index}`);
	}
	return helper;
}

function expectArrayExpression(expr: PhpExpr | undefined): PhpExprArray {
	expect(expr?.nodeType).toBe('Expr_Array');
	if (!expr || expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected array expression');
	}
	return expr as PhpExprArray;
}

function expectFuncCall(expr: PhpExpr | undefined): PhpExprFuncCall {
	expect(expr?.nodeType).toBe('Expr_FuncCall');
	if (!expr || expr.nodeType !== 'Expr_FuncCall') {
		throw new Error('Expected function call expression');
	}
	return expr as PhpExprFuncCall;
}

function expectExpressionStatement(
	stmt: PhpStmt | undefined
): Extract<PhpStmt, { nodeType: 'Stmt_Expression'; expr: PhpExpr }> {
	expect(stmt?.nodeType).toBe('Stmt_Expression');
	if (!stmt || stmt.nodeType !== 'Stmt_Expression') {
		throw new Error('Expected expression statement');
	}
	return stmt as Extract<
		PhpStmt,
		{ nodeType: 'Stmt_Expression'; expr: PhpExpr }
	>;
}

function expectAssignExpression(
	expr: PhpExpr | undefined
): Extract<PhpExpr, { nodeType: 'Expr_Assign'; expr: PhpExpr }> {
	expect(expr?.nodeType).toBe('Expr_Assign');
	if (!expr || expr.nodeType !== 'Expr_Assign') {
		throw new Error('Expected assign expression');
	}
	return expr as Extract<PhpExpr, { nodeType: 'Expr_Assign'; expr: PhpExpr }>;
}

function expectConstFetch(expr: PhpExpr | undefined): PhpExprConstFetch {
	expect(expr?.nodeType).toBe('Expr_ConstFetch');
	if (!expr || expr.nodeType !== 'Expr_ConstFetch') {
		throw new Error('Expected const fetch expression');
	}
	return expr as PhpExprConstFetch;
}

function expectHierarchicalFlag(
	helper: TaxonomyHelper,
	expected: boolean
): void {
	const methodNode = helper.node;
	expect(methodNode).toBeDefined();
	const returnStmt = findReturnStatement(methodNode?.stmts ?? []);
	const arrayExpr = expectArrayExpression(returnStmt?.expr ?? undefined);
	let hierarchicalItem: (typeof arrayExpr.items)[number] | undefined;
	for (const item of arrayExpr.items) {
		const key = item?.key;
		if (!item || !key || key.nodeType !== 'Scalar_String') {
			continue;
		}
		const keyNode = key as Extract<
			typeof key,
			{ nodeType: 'Scalar_String'; value: string }
		>;
		if (keyNode.value === 'hierarchical') {
			hierarchicalItem = item;
			break;
		}
	}
	if (!hierarchicalItem) {
		throw new Error(
			'Expected hierarchical entry in taxonomy helper response'
		);
	}
	const constFetch = expectConstFetch(hierarchicalItem.value);
	expect(constFetch.name.parts[0]).toBe(expected ? 'true' : 'false');
}

function expectFinalReturnTrim(helper: TaxonomyHelper): void {
	const methodNode = helper.node;
	expect(methodNode).toBeDefined();
	const returnStmt = findReturnStatement(methodNode?.stmts ?? []);
	const callExpr = expectFuncCall(returnStmt?.expr ?? undefined);
	expect(callExpr.name).toMatchObject({ nodeType: 'Name', parts: ['trim'] });
	expect(callExpr.args).toHaveLength(1);
	const [arg] = callExpr.args;
	expect(arg?.value?.nodeType.startsWith('Expr_Cast')).toBe(true);
	const castExpr = arg?.value;
	if (!castExpr || !castExpr.nodeType.startsWith('Expr_Cast')) {
		throw new Error('Expected trim argument to be a cast expression');
	}
	expect((castExpr as { type?: string }).type ?? 'string').toBe('string');
	const castExpression = castExpr as { expr: PhpExpr };
	expect(castExpression.expr).toMatchObject({
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
		): statement is Extract<PhpStmt, { nodeType: 'Stmt_Return' }> => {
			return statement.nodeType === 'Stmt_Return';
		}
	);
}

function findIfStatement(
	statements: readonly PhpStmt[],
	conditionType: string
): Extract<PhpStmt, { nodeType: 'Stmt_If' }> | undefined {
	return statements.find(
		(statement): statement is Extract<PhpStmt, { nodeType: 'Stmt_If' }> => {
			if (statement.nodeType !== 'Stmt_If') {
				return false;
			}
			const cond = (
				statement as Extract<typeof statement, { cond: PhpExpr }>
			).cond;
			return cond?.nodeType === conditionType;
		}
	);
}
