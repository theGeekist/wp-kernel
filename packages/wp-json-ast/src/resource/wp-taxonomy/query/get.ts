import type { ResourceStorageConfig } from '@wpkernel/core/resource';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildScalarString,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import {
	appendStatementsWithSpacing,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildMethodCallExpression,
	normaliseVariableReference,
} from '../../common/utils';
import { buildCacheInvalidators, type ResourceMetadataHost } from '../../cache';
import { buildReturnIfWpError, buildWpErrorReturn } from '../../errors';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildResolveTaxonomyTermCall,
	ensureWpTaxonomyStorage,
} from '../helpers';

export interface BuildWpTaxonomyGetRouteStatementsOptions {
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
	readonly storage: ResourceStorageConfig | undefined;
	readonly resourceName?: string;
	readonly requestVariable?: string;
	readonly identityVariable?: string;
}

export function buildWpTaxonomyGetRouteStatements(
	options: BuildWpTaxonomyGetRouteStatementsOptions
): PhpStmt[] {
	ensureWpTaxonomyStorage(options.storage, {
		resourceName: options.resourceName,
	});

	registerGetCacheInvalidation(options.metadataHost, options.cacheSegments);

	const statements: PhpStmt[] = [];
	const requestVariable = options.requestVariable ?? '$request';
	const identityRef = normaliseVariableReference(
		options.identityVariable ?? 'identity'
	);
	const requestRef = normaliseVariableReference(requestVariable);

	const requestParamCall = buildMethodCall(
		buildVariable(requestRef.raw),
		buildIdentifier('get_param'),
		[buildArg(buildScalarString(options.identity.param))]
	);

	const identityAssignment = buildExpressionStatement(
		buildAssign(
			buildVariable(identityRef.raw),
			buildMethodCallExpression({
				subject: 'this',
				method: `validate${options.pascalName}Identity`,
				args: [buildArg(requestParamCall)],
			})
		)
	);
	appendStatementsWithSpacing(statements, [
		identityAssignment,
		buildReturnIfWpError(buildVariable(identityRef.raw)),
	]);

	const termAssignment = buildExpressionStatement(
		buildAssign(
			buildVariable('term'),
			buildResolveTaxonomyTermCall(options.pascalName, identityRef.raw)
		)
	);
	appendStatementsWithSpacing(statements, [termAssignment]);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `Unable to locate ${options.pascalName} term.`,
		status: 404,
	});

	appendStatementsWithSpacing(statements, [
		buildIfStatementNode({
			condition: buildBooleanNot(buildInstanceof('term', 'WP_Term')),
			statements: [notFoundReturn],
		}),
	]);

	statements.push(
		buildReturn(
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term')
		)
	);

	return statements;
}

function registerGetCacheInvalidation(
	host: ResourceMetadataHost,
	segments: readonly unknown[]
): void {
	buildCacheInvalidators({
		host,
		events: [
			{
				scope: 'get',
				operation: 'read',
				segments,
				description: 'Get term request',
			},
		],
	});
}
