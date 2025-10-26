import type {
	ResourceControllerMetadata,
	ResourceMetadataHost,
	PhpStmt,
	PhpStmtClassMethod,
	PhpStmtExpression,
	PhpStmtReturn,
	PhpExpr,
	PhpExprAssign,
	PhpExprVariable,
	PhpArg,
} from '@wpkernel/php-json-ast';
import { buildTransientHelperMethods } from '../transient/helpers';
import {
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientUnsupportedRouteStatements,
} from '../transient/routes';
import { makeTransientResource } from '@wpkernel/test-utils/next/builders/php/resources.test-support';
import type { ResolvedIdentity } from '../../identity';

function createMetadataHost(): {
	metadata: ResourceControllerMetadata;
	host: ResourceMetadataHost;
} {
	const metadata: ResourceControllerMetadata = {
		kind: 'resource-controller',
		name: 'jobCache',
		identity: { type: 'number', param: 'id' },
		routes: [],
	};

	return {
		metadata,
		host: {
			getMetadata: () => metadata,
			setMetadata: (next) => {
				Object.assign(metadata, next);
			},
		},
	};
}

function expectClassMethod(method: PhpStmt): PhpStmtClassMethod {
	expect(method.nodeType).toBe('Stmt_ClassMethod');
	return method as PhpStmtClassMethod;
}

function isExpressionStatement(
	statement: PhpStmt | undefined
): statement is PhpStmtExpression {
	return statement?.nodeType === 'Stmt_Expression';
}

function isReturnStatement(
	statement: PhpStmt | undefined
): statement is PhpStmtReturn {
	return statement?.nodeType === 'Stmt_Return';
}

function isAssignExpr(expr: PhpExpr): expr is PhpExprAssign {
	return expr.nodeType === 'Expr_Assign';
}

function isVariableExpr(expr: PhpExpr): expr is PhpExprVariable {
	return expr.nodeType === 'Expr_Variable';
}

type VariableAssignmentStatement = PhpStmtExpression & {
	readonly expr: PhpExprAssign & { readonly var: PhpExprVariable };
};

function isVariableAssignment(
	statement: PhpStmt | undefined,
	variableName: string
): statement is VariableAssignmentStatement {
	if (!isExpressionStatement(statement)) {
		return false;
	}

	const expr = statement.expr;
	if (!isAssignExpr(expr)) {
		return false;
	}

	const variable = expr.var;
	if (!isVariableExpr(variable)) {
		return false;
	}

	return typeof variable.name === 'string' && variable.name === variableName;
}

describe('transient helper builders', () => {
	it('returns helper methods for transient key and expiration normalisation', () => {
		const resource = makeTransientResource();
		const helpers = buildTransientHelperMethods({
			resource,
			pascalName: 'JobCache',
			namespace: 'DemoNamespace',
		});
		const [keyMethod, normaliseMethod] = helpers;
		expect(keyMethod).toBeDefined();
		expect(normaliseMethod).toBeDefined();

		const keyHelper = expectClassMethod(keyMethod!);
		expect(keyHelper.name?.name).toBe('getJobCacheTransientKey');
		expect(keyHelper.params).toHaveLength(1);
		const [segmentsParam] = keyHelper.params ?? [];
		expect(segmentsParam?.variadic).toBe(true);
		expect(segmentsParam?.var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'segments',
		});

		const initialiseParts = keyHelper.stmts?.[0];
		expect(initialiseParts).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: {
				nodeType: 'Expr_Assign',
				var: expect.objectContaining({
					nodeType: 'Expr_Variable',
					name: 'parts',
				}),
				expr: expect.objectContaining({
					nodeType: 'Expr_Array',
					items: expect.arrayContaining([
						expect.objectContaining({
							value: expect.objectContaining({
								nodeType: 'Scalar_String',
								value: 'demo_namespace_job_cache',
							}),
						}),
					]),
				}),
			},
		});

		const keyReturn = keyHelper.stmts?.[keyHelper.stmts.length - 1];
		expect(keyReturn).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: {
				nodeType: 'Expr_FuncCall',
				name: expect.objectContaining({
					nodeType: 'Name',
					parts: ['implode'],
				}),
			},
		});

		const expirationHelper = expectClassMethod(normaliseMethod!);
		expect(expirationHelper.name?.name).toBe('normaliseJobCacheExpiration');
		const firstStatement = expirationHelper.stmts?.[0];
		expect(firstStatement).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_Identical' },
		});
		expect(expirationHelper.stmts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					nodeType: 'Stmt_Return',
					expr: expect.objectContaining({
						nodeType: 'Scalar_LNumber',
						value: 0,
					}),
				}),
			])
		);

		const sanitiseStatement = expirationHelper.stmts?.find((statement) =>
			isVariableAssignment(statement, 'sanitised')
		);
		if (!sanitiseStatement) {
			throw new Error(
				'Expected sanitise statement to be an expression statement.'
			);
		}

		const sanitiseExpr = sanitiseStatement.expr;
		expect(sanitiseExpr.expr).toMatchObject({ nodeType: 'Expr_FuncCall' });

		const normaliseSerialised = JSON.stringify(
			expirationHelper.stmts ?? []
		);
		expect(normaliseSerialised).toContain('is_numeric');
		expect(normaliseSerialised).toContain('max');
	});
});

describe('transient route builders', () => {
	it('builds get route statements and records cache metadata', () => {
		const resource = makeTransientResource();
		const { metadata, host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'number', param: 'id' };
		const route = resource.routes[0]!;

		const statements = buildTransientGetRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route,
			usesIdentity: false,
		});

		expect(statements).toHaveLength(4);
		expect(statements[0]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: { nodeType: 'Expr_Assign' },
		});
		expect(statements[3]).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: { nodeType: 'Expr_Array' },
		});

		const cache = metadata.cache;
		expect(cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'get',
					operation: 'read',
					segments: ['jobCache', 'get'],
					description: 'Read transient value',
				}),
			])
		);
	});

	it('builds set route statements, invalidates cache, and returns state payload', () => {
		const resource = makeTransientResource();
		const { metadata, host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'number', param: 'id' };
		const route = resource.routes[1]!;

		const statements = buildTransientSetRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route,
			usesIdentity: false,
		});

		expect(statements).toHaveLength(9);
		expect(statements[2]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: { nodeType: 'Expr_Assign' },
		});

		const expirationAssignment = statements.find(
			(statement): statement is VariableAssignmentStatement =>
				isVariableAssignment(statement, 'expiration')
		);
		if (!expirationAssignment) {
			throw new Error('Expected expiration assignment to be present.');
		}
		const expirationExpr = expirationAssignment.expr;
		expect(expirationExpr).toMatchObject({
			expr: expect.objectContaining({
				nodeType: 'Expr_MethodCall',
				name: expect.objectContaining({
					name: 'normaliseJobCacheExpiration',
				}),
			}),
		});

		const setTransientCall = statements.find(
			(statement): statement is VariableAssignmentStatement =>
				isVariableAssignment(statement, 'stored')
		);
		if (!setTransientCall) {
			throw new Error(
				'Expected stored flag assignment to be an expression statement.'
			);
		}
		expect(setTransientCall.expr.expr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: expect.objectContaining({ parts: ['set_transient'] }),
		});

		const returnStatement = statements[8];
		if (!isReturnStatement(returnStatement)) {
			throw new Error('Expected return statement to be present.');
		}
		expect(returnStatement.expr?.nodeType).toBe('Expr_Array');
		const storedPayload = JSON.stringify(returnStatement);
		expect(storedPayload).toContain('Expr_Cast_Bool');
		expect(JSON.stringify(statements)).toContain('set_transient');

		const cache = metadata.cache;
		expect(cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'get',
					operation: 'invalidate',
					description: 'Invalidate transient value',
				}),
			])
		);
	});

	it('builds delete route statements, invalidates cache, and returns deletion payload', () => {
		const resource = makeTransientResource();
		const { metadata, host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'number', param: 'id' };
		const route = resource.routes[2]!;

		const statements = buildTransientDeleteRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route,
			usesIdentity: false,
		});

		expect(statements).toHaveLength(6);
		expect(statements[0]).toMatchObject({
			nodeType: 'Stmt_Expression',
			expr: { nodeType: 'Expr_Assign' },
		});

		const deleteAssignment = statements.find(
			(statement): statement is VariableAssignmentStatement =>
				isVariableAssignment(statement, 'deleted')
		);
		if (!deleteAssignment) {
			throw new Error('Expected delete assignment to be present.');
		}
		expect(deleteAssignment.expr.expr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: expect.objectContaining({ parts: ['delete_transient'] }),
		});

		const returnStatement = statements[5];
		if (!isReturnStatement(returnStatement)) {
			throw new Error('Expected delete return statement to be present.');
		}

		const serialised = JSON.stringify(returnStatement);
		expect(serialised).toContain('deleted');
		expect(serialised).toContain('previous');
		expect(serialised).toContain('Expr_Cast_Bool');

		const cache = metadata.cache;
		expect(cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'get',
					operation: 'invalidate',
					description: 'Delete transient value',
				}),
			])
		);
	});

	it('passes identity segments to the transient key helper when routes use identity', () => {
		const routes = [
			{
				method: 'GET',
				path: '/kernel/v1/job-cache/:slug',
				policy: undefined,
				hash: 'transient-get',
				transport: 'local',
			},
			{
				method: 'PUT',
				path: '/kernel/v1/job-cache/:slug',
				policy: undefined,
				hash: 'transient-set',
				transport: 'local',
			},
			{
				method: 'DELETE',
				path: '/kernel/v1/job-cache/:slug',
				policy: undefined,
				hash: 'transient-delete',
				transport: 'local',
			},
		] as const;

		const resource = makeTransientResource({
			routes: routes.slice(),
			identity: { type: 'string', param: 'slug' },
		});

		const { host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const route = resource.routes[0]!;

		const statements = buildTransientGetRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route,
			usesIdentity: true,
		});

		const assignment = statements[0];
		if (!isVariableAssignment(assignment, 'key')) {
			throw new Error('Expected first statement to assign key variable.');
		}

		const methodCall = assignment.expr.expr;
		if (methodCall.nodeType !== 'Expr_MethodCall') {
			throw new Error(
				'Expected key assignment to call the transient key helper.'
			);
		}

		const args =
			(methodCall as typeof methodCall & { args?: readonly PhpArg[] })
				.args ?? [];
		expect(args).toHaveLength(1);
		const [identityArg] = args as readonly PhpArg[];
		if (!identityArg) {
			throw new Error('Expected identity argument to be defined.');
		}
		expect(identityArg.value).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'slug',
		});
	});

	it('records cache read and invalidation events when sharing metadata host', () => {
		const resource = makeTransientResource();
		const { metadata, host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'number', param: 'id' };
		const [getRoute, setRoute] = resource.routes;

		buildTransientGetRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route: getRoute!,
			usesIdentity: false,
		});
		buildTransientSetRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route: setRoute!,
			usesIdentity: false,
		});

		expect(metadata.cache?.events).toEqual([
			expect.objectContaining({
				scope: 'get',
				operation: 'read',
				description: 'Read transient value',
			}),
			expect.objectContaining({
				scope: 'get',
				operation: 'invalidate',
				description: 'Invalidate transient value',
			}),
		]);
	});

	it('returns WP_Error for unsupported routes', () => {
		const resource = makeTransientResource();
		const { host } = createMetadataHost();
		const identity: ResolvedIdentity = { type: 'number', param: 'id' };
		const route = resource.routes[0]!;

		const [statement] = buildTransientUnsupportedRouteStatements({
			resource,
			pascalName: 'JobCache',
			metadataHost: host,
			identity,
			route,
			usesIdentity: false,
			errorCodeFactory: (suffix: string) => `wpk_job_cache_${suffix}`,
		});

		expect(statement).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: {
				nodeType: 'Expr_New',
				class: { parts: ['WP_Error'] },
				args: expect.arrayContaining([
					expect.objectContaining({
						value: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'wpk_job_cache_unsupported_operation',
						}),
					}),
					expect.objectContaining({
						value: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'Operation not supported for JobCache transient.',
						}),
					}),
					expect.objectContaining({
						value: expect.objectContaining({
							nodeType: 'Expr_Array',
							items: expect.arrayContaining([
								expect.objectContaining({
									key: expect.objectContaining({
										value: 'status',
									}),
									value: expect.objectContaining({
										value: 501,
									}),
								}),
							]),
						}),
					}),
				]),
			},
		});
	});
});
