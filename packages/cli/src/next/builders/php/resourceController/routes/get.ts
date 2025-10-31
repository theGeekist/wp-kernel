import {
	buildArg,
	buildReturn,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceMetadataHost } from '@wpkernel/wp-json-ast';
import {
	appendResourceCacheEvent,
	buildBooleanNot,
	buildIdentityValidationStatements,
	buildIfStatementNode,
	buildInstanceof,
	buildWpErrorReturn,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	appendStatementsWithSpacing,
	isNumericIdentity,
} from '../../resource';
import type { ResolvedIdentity } from '../../identity';
import type { IdentityValidationOptions } from '../../resource/wpPost/identity';
import type { IRResource } from '../../../../ir/publicTypes';

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

	const identityValidationOptions: IdentityValidationOptions =
		isNumericIdentity(options.identity)
			? {
					identity: options.identity,
					pascalName: options.pascalName,
					errorCodeFactory: options.errorCodeFactory,
				}
			: {
					identity: options.identity,
					pascalName: options.pascalName,
					errorCodeFactory: options.errorCodeFactory,
				};
	const identityStatements = buildIdentityValidationStatements(
		identityValidationOptions
	);

	appendStatementsWithSpacing(statements, identityStatements);

	const param = options.identity.param;
	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post',
			subject: 'this',
			method: `resolve${options.pascalName}Post`,
			args: [buildArg(buildVariable(param))],
		})
	);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	appendStatementsWithSpacing(statements, [
		buildIfStatementNode({
			condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
			statements: [notFoundReturn],
		}),
	]);

	statements.push(
		buildReturn(
			buildMethodCallExpression({
				subject: 'this',
				method: `prepare${options.pascalName}Response`,
				args: [
					buildArg(buildVariable('post')),
					buildArg(buildVariable('request')),
				],
			})
		)
	);

	return statements;
}
