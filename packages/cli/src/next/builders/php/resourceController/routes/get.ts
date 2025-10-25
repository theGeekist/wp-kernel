import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildStmtNop,
	buildVariable,
	type PhpStmt,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	appendResourceCacheEvent,
	buildBooleanNot,
	buildIdentityValidationStatements,
	buildIfStatementNode,
	buildInstanceof,
	buildWpErrorReturn,
	buildWpTaxonomyGetRouteStatements,
} from '../../resource';
import type { ResolvedIdentity } from '../../identity';
import type { IRResource } from '../../../../../ir/types';

export interface BuildGetRouteStatementsOptions {
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildGetRouteStatements(
	options: BuildGetRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage) {
		return null;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyGetRouteStatements({
			resource: options.resource,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
		return null;
	}

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'Get request',
	});

	const statements: PhpStmt[] = [];

	const identityStatements = buildIdentityValidationStatements({
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
	});

	statements.push(...identityStatements);

	if (identityStatements.length > 0) {
		statements.push(buildStmtNop());
	}

	const param = options.identity.param;
	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`resolve${options.pascalName}Post`),
					[buildArg(buildVariable(param))]
				)
			)
		)
	);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	statements.push(
		buildIfStatementNode({
			condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
			statements: [notFoundReturn],
		})
	);

	statements.push(buildStmtNop());

	statements.push(
		buildReturn(
			buildMethodCall(
				buildVariable('this'),
				buildIdentifier(`prepare${options.pascalName}Response`),
				[
					buildArg(buildVariable('post')),
					buildArg(buildVariable('request')),
				]
			)
		)
	);

	return statements;
}
