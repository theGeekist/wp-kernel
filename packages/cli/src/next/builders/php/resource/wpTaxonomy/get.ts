import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	type PhpStmt,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import { buildWpErrorReturn, buildReturnIfWpError } from '../errors';
import {
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
} from '../utils';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildResolveTaxonomyTermCall,
} from './helpers';

type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface BuildWpTaxonomyGetRouteStatementsOptions {
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildWpTaxonomyGetRouteStatements(
	options: BuildWpTaxonomyGetRouteStatementsOptions
): PhpStmt[] {
	ensureStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'Get term request',
	});

	const statements: PhpStmt[] = [];

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('identity'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`validate${options.pascalName}Identity`),
					[
						buildArg(
							buildMethodCall(
								buildVariable('request'),
								buildIdentifier('get_param'),
								[
									buildArg(
										buildScalarString(
											options.identity.param
										)
									),
								]
							)
						),
					]
				)
			)
		)
	);

	statements.push(buildReturnIfWpError(buildVariable('identity')));
	statements.push(buildStmtNop());

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('term'),
				buildResolveTaxonomyTermCall(options.pascalName)
			)
		)
	);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `Unable to locate ${options.pascalName} term.`,
		status: 404,
	});

	const guard = buildIfStatementNode({
		condition: buildBooleanNot(buildInstanceof('term', 'WP_Term')),
		statements: [notFoundReturn],
	});
	statements.push(guard);
	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term')
		)
	);

	return statements;
}

function ensureStorage(resource: IRResource): WpTaxonomyStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-taxonomy') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-taxonomy storage.',
			context: { name: resource.name },
		});
	}
	return storage;
}
