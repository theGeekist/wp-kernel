import type {
	PhpArg,
	PhpExprAssign,
	PhpExprMethodCall,
	PhpExprVariable,
	PhpStmt,
	PhpStmtClassMethod,
	PhpStmtExpression,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

import {
	buildTransientHelperMethods,
	buildTransientGetRouteStatements,
	buildTransientSetRouteStatements,
	buildTransientDeleteRouteStatements,
	buildTransientUnsupportedRouteStatements,
	buildTransientStorageArtifacts,
	resolveTransientKey,
} from '../index';
import type { ResourceMetadataHost } from '../../../cache';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../../../../types';
import type { ResolvedIdentity } from '../../../../pipeline/identity';
import type { RestControllerRouteStatementsContext } from '../../../../rest-controller/pipeline';

function expectClassMethod(candidate: PhpStmt | undefined): PhpStmtClassMethod {
	if (candidate && candidate.nodeType === 'Stmt_ClassMethod') {
		return candidate as PhpStmtClassMethod;
	}

	throw new Error('Expected class method statement');
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

function isVariableAssignment(
	statement: PhpStmt | undefined,
	variableName: string
): statement is PhpStmtExpression & {
	readonly expr: PhpExprAssign & { readonly var: PhpExprVariable };
} {
	if (!isExpressionStatement(statement)) {
		return false;
	}

	const expr = statement.expr;
	if (expr.nodeType !== 'Expr_Assign') {
		return false;
	}

	const assign = expr as PhpExprAssign;
	const variable = assign.var;

	if (variable.nodeType !== 'Expr_Variable') {
		return false;
	}

	const variableNode = variable as PhpExprVariable;
	const name = variableNode.name;
	return typeof name === 'string' && name === variableName;
}

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

const cacheSegments = ['jobCache', 'get'] as const;

describe('resolveTransientKey', () => {
	it('normalises namespace and resource names into snake case', () => {
		expect(
			resolveTransientKey({
				resourceName: 'JobCache',
				namespace: 'Demo\\\\Plugin',
			})
		).toBe('demo_plugin_job_cache');
	});

	it('falls back to resource slug when namespace is empty', () => {
		expect(
			resolveTransientKey({
				resourceName: 'Job Cache',
				namespace: '',
			})
		).toBe('job_cache');
	});
});

describe('transient helper methods', () => {
	it('returns helper methods for transient key and expiration normalisation', () => {
		const helpers = buildTransientHelperMethods({
			pascalName: 'JobCache',
			key: 'demo_plugin_job_cache',
		});

		expect(helpers).toHaveLength(2);

		const [keyMethod, expirationMethod] = helpers;

		const keyHelper = expectClassMethod(keyMethod);
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
				expr: expect.objectContaining({
					nodeType: 'Expr_Array',
				}),
			},
		});

		const keyReturn = keyHelper.stmts?.[keyHelper.stmts.length - 1];
		expect(keyReturn).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: expect.objectContaining({
				nodeType: 'Expr_FuncCall',
				name: expect.objectContaining({ parts: ['implode'] }),
			}),
		});

		const expirationHelper = expectClassMethod(expirationMethod);
		expect(expirationHelper.name?.name).toBe('normaliseJobCacheExpiration');
		expect(expirationHelper.stmts?.[0]).toMatchObject({
			nodeType: 'Stmt_If',
			cond: { nodeType: 'Expr_BinaryOp_Identical' },
		});
		expect(JSON.stringify(expirationHelper.stmts ?? [])).toContain('max');
	});
});

describe('transient route statements', () => {
	const identity: ResolvedIdentity = { type: 'number', param: 'id' };

	it('builds get route statements and records cache metadata', () => {
		const { metadata, host } = createMetadataHost();

		const statements = buildTransientGetRouteStatements({
			pascalName: 'JobCache',
			metadataHost: host,
			cacheSegments,
			identity,
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

		expect(metadata.cache?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					scope: 'get',
					operation: 'read',
					segments: ['jobCache', 'get'],
				}),
			])
		);
	});

	it('builds set route statements, invalidates cache, and returns state payload', () => {
		const { metadata, host } = createMetadataHost();

		const statements = buildTransientSetRouteStatements({
			pascalName: 'JobCache',
			metadataHost: host,
			cacheSegments,
			identity,
			usesIdentity: false,
		});

		expect(statements).toHaveLength(9);
		const expirationAssignment = statements.find((statement) =>
			isVariableAssignment(statement, 'expiration')
		);
		expect(expirationAssignment).toBeDefined();

		const storedAssignment = statements.find((statement) =>
			isVariableAssignment(statement, 'stored')
		);
		expect(storedAssignment).toBeDefined();
		expect(storedAssignment?.expr.expr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: expect.objectContaining({ parts: ['set_transient'] }),
		});

		const returnStatement = statements[8];
		expect(isReturnStatement(returnStatement)).toBe(true);
		expect(JSON.stringify(returnStatement)).toContain('Expr_Cast_Bool');

		expect(metadata.cache?.events).toEqual(
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
		const { metadata, host } = createMetadataHost();

		const statements = buildTransientDeleteRouteStatements({
			pascalName: 'JobCache',
			metadataHost: host,
			cacheSegments,
			identity,
			usesIdentity: false,
		});

		expect(statements).toHaveLength(6);
		const deleteAssignment = statements.find((statement) =>
			isVariableAssignment(statement, 'deleted')
		);
		expect(deleteAssignment).toBeDefined();
		expect(deleteAssignment?.expr.expr).toMatchObject({
			nodeType: 'Expr_FuncCall',
			name: expect.objectContaining({ parts: ['delete_transient'] }),
		});

		const returnStatement = statements[5];
		expect(isReturnStatement(returnStatement)).toBe(true);
		expect(JSON.stringify(returnStatement)).toContain('deleted');

		expect(metadata.cache?.events).toEqual(
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
		const { host } = createMetadataHost();
		const stringIdentity: ResolvedIdentity = {
			type: 'string',
			param: 'slug',
		};

		const statements = buildTransientGetRouteStatements({
			pascalName: 'JobCache',
			metadataHost: host,
			cacheSegments,
			identity: stringIdentity,
			usesIdentity: true,
		});

		const assignment = statements[0];
		if (!isVariableAssignment(assignment, 'key')) {
			throw new Error('Expected first statement to assign key variable.');
		}

		const methodCall = assignment.expr.expr;
		if (methodCall.nodeType !== 'Expr_MethodCall') {
			throw new Error(
				'Expected key assignment to call transient key helper.'
			);
		}

		const args = ((methodCall as PhpExprMethodCall).args ??
			[]) as readonly PhpArg[];
		expect(args).toHaveLength(1);
		const [identityArg] = args;
		expect(identityArg?.value).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'slug',
		});
	});

	describe('transient storage artifacts', () => {
		const storageIdentity: ResolvedIdentity = {
			type: 'number',
			param: 'id',
		};
		const pascalName = 'JobCache';
		const errorCodeFactory = (suffix: string) => `wpk_job_cache_${suffix}`;

		function createRouteContext(
			method: string,
			kind: ResourceControllerRouteMetadata['kind'],
			path: string
		): {
			readonly context: RestControllerRouteStatementsContext;
			readonly metadata: ResourceControllerMetadata;
		} {
			const { metadata, host } = createMetadataHost();
			const routeMetadata: ResourceControllerRouteMetadata = {
				method,
				kind,
				path,
			};

			return {
				metadata,
				context: {
					metadata: routeMetadata,
					metadataHost: host,
				},
			};
		}

		it('aggregates helper methods and transient route handlers', () => {
			const artifacts = buildTransientStorageArtifacts({
				pascalName,
				key: 'demo_plugin_job_cache',
				identity: storageIdentity,
				cacheSegments,
				errorCodeFactory,
			});

			expect(artifacts.helperMethods).toHaveLength(2);

			const aggregatedGetRoute = createRouteContext(
				'GET',
				'get',
				'/job-cache'
			);
			const directGetRoute = createRouteContext(
				'GET',
				'get',
				'/job-cache'
			);

			const aggregatedGet = artifacts.routeHandlers.get?.(
				aggregatedGetRoute.context
			);
			const directGet = buildTransientGetRouteStatements({
				pascalName,
				metadataHost: directGetRoute.context.metadataHost,
				cacheSegments,
				identity: storageIdentity,
				usesIdentity: true,
			});

			expect(aggregatedGet).toEqual(directGet);
			expect(aggregatedGetRoute.metadata.cache?.events).toEqual(
				directGetRoute.metadata.cache?.events
			);

			const aggregatedSetRoute = createRouteContext(
				'POST',
				'custom',
				'/job-cache'
			);
			const directSetRoute = createRouteContext(
				'POST',
				'custom',
				'/job-cache'
			);

			const aggregatedSet = artifacts.routeHandlers.set?.(
				aggregatedSetRoute.context
			);
			const directSet = buildTransientSetRouteStatements({
				pascalName,
				metadataHost: directSetRoute.context.metadataHost,
				cacheSegments,
				identity: storageIdentity,
				usesIdentity: false,
			});

			expect(aggregatedSet).toEqual(directSet);
			expect(aggregatedSetRoute.metadata.cache?.events).toEqual(
				directSetRoute.metadata.cache?.events
			);
		});

		it('returns WP_Error statements for unsupported operations', () => {
			const artifacts = buildTransientStorageArtifacts({
				pascalName,
				key: 'demo_plugin_job_cache',
				identity: storageIdentity,
				cacheSegments,
				errorCodeFactory,
			});

			const unsupportedRoute = createRouteContext(
				'HEAD',
				'custom',
				'/job-cache'
			);

			const [errorReturn] =
				artifacts.routeHandlers.unsupported?.(
					unsupportedRoute.context
				) ?? [];

			expect(errorReturn).toMatchObject({
				nodeType: 'Stmt_Return',
				expr: {
					nodeType: 'Expr_New',
					args: expect.arrayContaining([
						expect.objectContaining({
							value: expect.objectContaining({
								value: 'wpk_job_cache_unsupported_operation',
							}),
						}),
					]),
				},
			});
		});
	});

	it('returns WP_Error payloads for unsupported operations', () => {
		const { host } = createMetadataHost();

		const [errorReturn] = buildTransientUnsupportedRouteStatements({
			pascalName: 'JobCache',
			metadataHost: host,
			cacheSegments,
			identity,
			usesIdentity: false,
			errorCodeFactory: (suffix: string) => `wpk_job_cache_${suffix}`,
		});

		expect(errorReturn).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: {
				nodeType: 'Expr_New',
				args: expect.arrayContaining([
					expect.objectContaining({
						value: expect.objectContaining({
							nodeType: 'Scalar_String',
							value: 'wpk_job_cache_unsupported_operation',
						}),
					}),
				]),
			},
		});
	});
});
