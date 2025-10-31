import type {
	PhpExpr,
	PhpExprArray,
	PhpExprFuncCall,
	PhpStmt,
	PhpStmtIf,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

import {
	buildWpTaxonomyHelperMethods,
	buildTaxonomyAssignmentStatement,
	buildGetTaxonomyCall,
	buildResolveTaxonomyTermCall,
	buildPrepareTaxonomyTermResponseCall,
	ensureWpTaxonomyStorage,
	type BuildWpTaxonomyHelperMethodsOptions,
	type WpTaxonomyHelperMethod,
	type WpTaxonomyStorageConfig,
} from '../index';
import type { ResolvedIdentity } from '../../../../pipeline/identity';

const baseStorage: WpTaxonomyStorageConfig = {
	mode: 'wp-taxonomy',
	taxonomy: 'job_category',
	hierarchical: true,
};

const identity: ResolvedIdentity = {
	type: 'string',
	param: 'slug',
};

function buildHelpers(
	overrides: Partial<BuildWpTaxonomyHelperMethodsOptions['storage']> = {}
) {
	return buildWpTaxonomyHelperMethods({
		pascalName: 'JobCategories',
		storage: { ...baseStorage, ...overrides },
		identity,
		errorCodeFactory: (suffix) => `taxonomy_${suffix}`,
	});
}

describe('buildWpTaxonomyHelperMethods', () => {
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
		const callExpr = expectFuncCall(assignExpr.expr);
		expect(callExpr.name).toMatchObject({ parts: ['sanitize_title'] });

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

describe('taxonomy helper call sites', () => {
	it('builds taxonomy assignment statements and helper calls', () => {
		const assignment = buildTaxonomyAssignmentStatement({
			pascalName: 'JobCategories',
			targetVariable: 'taxonomyName',
		});

		expect(assignment).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: {
					nodeType: 'Expr_MethodCall',
					name: { name: 'getJobCategoriesTaxonomy' },
				},
			},
		});

		expect(buildGetTaxonomyCall('JobCategories')).toMatchObject({
			nodeType: 'Expr_MethodCall',
			name: { name: 'getJobCategoriesTaxonomy' },
		});

		const resolveCall = buildResolveTaxonomyTermCall(
			'JobCategories',
			'identityVar'
		);
		expect(resolveCall).toMatchObject({
			nodeType: 'Expr_MethodCall',
			name: { name: 'resolveJobCategoriesTerm' },
		});
		expect(resolveCall.args?.[0]?.value).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'identityVar',
		});

		const prepareCall = buildPrepareTaxonomyTermResponseCall(
			'JobCategories',
			'termVar'
		);
		expect(prepareCall).toMatchObject({
			nodeType: 'Expr_MethodCall',
			name: { name: 'prepareJobCategoriesTermResponse' },
		});
		expect(prepareCall.args?.[0]?.value).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'termVar',
		});
	});
});

describe('ensureWpTaxonomyStorage', () => {
	it('returns taxonomy storage when provided', () => {
		const storage = ensureWpTaxonomyStorage(baseStorage, {
			resourceName: 'jobCategories',
		});

		expect(storage).toBe(baseStorage);
	});

	it('throws when storage is not taxonomy configured', () => {
		expect(() => ensureWpTaxonomyStorage(undefined)).toThrow(
			/wp-taxonomy storage/
		);
	});
});

function getHelper(
	helpers: ReadonlyArray<WpTaxonomyHelperMethod>,
	index: number
): WpTaxonomyHelperMethod {
	const helper = helpers[index];
	if (!helper) {
		throw new Error(`Expected helper at index ${index}`);
	}
	return helper;
}

function expectArrayExpression(expr: PhpExpr | null | undefined): PhpExprArray {
	expect(expr?.nodeType).toBe('Expr_Array');
	if (!expr || expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected array expression');
	}
	return expr as PhpExprArray;
}

function expectFuncCall(expr: PhpExpr | null | undefined): PhpExprFuncCall {
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
		throw new Error('Expected assignment expression');
	}
	return expr as Extract<PhpExpr, { nodeType: 'Expr_Assign'; expr: PhpExpr }>;
}

function expectHierarchicalFlag(
	helper: WpTaxonomyHelperMethod,
	hierarchical: boolean
): void {
	const method = helper.node;
	const returnStmt = method?.stmts?.[0];
	expect(returnStmt?.nodeType).toBe('Stmt_Return');
	const returnExpr = (returnStmt as PhpStmtReturn | undefined)?.expr;
	const arrayExpr = expectArrayExpression(returnExpr);
	const hierarchicalItem = arrayExpr.items?.[4];
	const value = hierarchicalItem?.value;
	expect(value).toMatchObject({
		nodeType: 'Expr_ConstFetch',
		name: { parts: [hierarchical ? 'true' : 'false'] },
	});
}

function findIfStatement(
	stmts: readonly PhpStmt[],
	kind: string
): PhpStmtIf | undefined {
	return stmts.find((stmt): stmt is PhpStmtIf => {
		if (stmt.nodeType !== 'Stmt_If') {
			return false;
		}

		const ifStatement = stmt as PhpStmtIf;
		return ifStatement.cond?.nodeType === kind;
	});
}

function findReturnStatement(
	stmts: readonly PhpStmt[]
): PhpStmtReturn | undefined {
	return stmts.find(
		(stmt): stmt is PhpStmtReturn => stmt.nodeType === 'Stmt_Return'
	);
}

function expectFinalReturnTrim(helper: WpTaxonomyHelperMethod): void {
	const returnStmt = findReturnStatement(helper.node?.stmts ?? []);
	expect(returnStmt?.expr).toMatchObject({
		nodeType: 'Expr_FuncCall',
		name: { parts: ['trim'] },
	});
}
