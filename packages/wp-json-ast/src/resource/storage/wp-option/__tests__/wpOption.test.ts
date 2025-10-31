import type {
	PhpStmtClassMethod,
	PhpStmtIf,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

import {
	buildWpOptionHelperMethods,
	buildWpOptionGetRouteStatements,
	buildWpOptionUpdateRouteStatements,
	buildWpOptionUnsupportedRouteStatements,
	buildWpOptionStorageArtifacts,
} from '../index';
import type { RestControllerRouteStatementsContext } from '../../../../rest-controller/pipeline';
import type { PhpFileMetadata } from '../../../../types';

function expectClassMethod(
	candidate: PhpStmtClassMethod | undefined
): PhpStmtClassMethod {
	expect(candidate?.nodeType).toBe('Stmt_ClassMethod');
	if (!candidate || candidate.nodeType !== 'Stmt_ClassMethod') {
		throw new Error('Expected class method statement');
	}

	return candidate;
}

describe('wp-option storage helpers', () => {
	it('creates helper methods for option name and autoload normalisation', () => {
		const methods = buildWpOptionHelperMethods({
			pascalName: 'Demo',
			optionName: 'demo_option',
		});

		expect(methods).toHaveLength(2);

		const [optionNameMethod, autoloadMethod] = methods;

		const optionHelper = expectClassMethod(optionNameMethod);
		expect(optionHelper.name?.name).toBe('getDemoOptionName');
		const returnStatement = optionHelper.stmts?.[0];
		expect(returnStatement?.nodeType).toBe('Stmt_Return');
		const helperReturn = returnStatement as PhpStmtReturn | undefined;
		expect(helperReturn?.expr).toMatchObject({
			nodeType: 'Scalar_String',
			value: 'demo_option',
		});

		const autoloadHelper = expectClassMethod(autoloadMethod);
		expect(autoloadHelper.name?.name).toBe('normaliseDemoAutoload');
		const firstGuard = autoloadHelper.stmts?.[0];
		expect(firstGuard?.nodeType).toBe('Stmt_If');
		const guard = firstGuard as PhpStmtIf | undefined;
		expect(guard?.cond).toMatchObject({
			nodeType: 'Expr_BinaryOp_Identical',
		});
	});

	describe('wp-option storage artifacts', () => {
		const sharedOptions = {
			pascalName: 'Demo',
			optionName: 'demo_option',
			errorCodeFactory: (suffix: string) => `demo_${suffix}`,
		} as const;

		const routeOptions = {
			pascalName: sharedOptions.pascalName,
			optionName: sharedOptions.optionName,
		} as const;

		const stubContext = {
			metadata: { method: 'GET', path: '/demo', kind: 'get' },
			metadataHost: {
				getMetadata: () =>
					({ kind: 'resource-controller' }) as PhpFileMetadata,
				setMetadata: () => undefined,
			},
		} as RestControllerRouteStatementsContext;

		it('exposes helper methods and route handlers from a single factory', () => {
			const artifacts = buildWpOptionStorageArtifacts(sharedOptions);

			expect(artifacts.helperMethods).toHaveLength(2);
			const [optionNameMethod, autoloadMethod] = artifacts.helperMethods;
			const optionHelper = expectClassMethod(optionNameMethod);
			const autoloadHelper = expectClassMethod(autoloadMethod);
			expect(optionHelper.name?.name).toBe('getDemoOptionName');
			expect(autoloadHelper.name?.name).toBe('normaliseDemoAutoload');

			const getStatements =
				artifacts.routeHandlers.get?.(stubContext) ?? [];
			expect(getStatements).toEqual(
				buildWpOptionGetRouteStatements(routeOptions)
			);

			const updateStatements =
				artifacts.routeHandlers.update?.(stubContext) ?? [];
			expect(updateStatements).toEqual(
				buildWpOptionUpdateRouteStatements(routeOptions)
			);

			const [unsupported] =
				artifacts.routeHandlers.unsupported?.(stubContext) ?? [];
			expect(unsupported?.nodeType).toBe('Stmt_Return');
		});
	});
});

describe('wp-option route statements', () => {
	const sharedOptions = {
		pascalName: 'Demo',
		optionName: 'demo_option',
	} as const;

	it('reads option values and returns response payloads', () => {
		const statements = buildWpOptionGetRouteStatements(sharedOptions);

		expect(statements).toHaveLength(4);
		expect(statements[0]).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: {
					nodeType: 'Expr_MethodCall',
					name: { name: `get${sharedOptions.pascalName}OptionName` },
				},
			},
		});
		expect(statements[1]).toMatchObject({
			expr: {
				nodeType: 'Expr_Assign',
				expr: {
					nodeType: 'Expr_FuncCall',
					name: { parts: ['get_option'] },
				},
			},
		});
		const returnStmt = statements[3];
		expect(returnStmt).toMatchObject({ nodeType: 'Stmt_Return' });
	});

	it('updates option values and returns metadata', () => {
		const statements = buildWpOptionUpdateRouteStatements(sharedOptions);

		expect(statements).toHaveLength(10);
		expect(statements[0]).toMatchObject({
			expr: {
				expr: {
					nodeType: 'Expr_MethodCall',
					name: { name: `get${sharedOptions.pascalName}OptionName` },
				},
			},
		});
		expect(statements[3]).toMatchObject({
			expr: {
				expr: {
					nodeType: 'Expr_MethodCall',
					name: {
						name: `normalise${sharedOptions.pascalName}Autoload`,
					},
				},
			},
		});
		expect(statements[5]).toMatchObject({
			expr: {
				expr: {
					nodeType: 'Expr_Ternary',
				},
			},
		});
		const response = statements[9];
		expect(response).toMatchObject({ nodeType: 'Stmt_Return' });
	});

	it('returns WP_Error payloads for unsupported operations', () => {
		const [errorReturn] = buildWpOptionUnsupportedRouteStatements({
			...sharedOptions,
			errorCodeFactory: (suffix) => `demo_${suffix}`,
		});

		expect(errorReturn).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: {
				nodeType: 'Expr_New',
				args: expect.arrayContaining([
					expect.objectContaining({
						value: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'demo_unsupported_operation',
						}),
					}),
				]),
			},
		});
	});
});
