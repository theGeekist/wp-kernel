import {
	buildArg,
	buildReturn,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import {
	appendResourceCacheEvent,
	type ResourceMetadataHost,
} from '../../cache';
import {
	appendStatementsWithSpacing,
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
} from '../../common/utils';
import { buildWpErrorReturn } from '../../errors';
import {
	buildIdentityGuardStatements,
	isNumericIdentity,
	type IdentityGuardOptions,
	type ResolvedIdentity,
} from '../../../pipeline/identity';
import type { MutationHelperResource } from '../mutation';

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

export interface BuildWpPostGetRouteStatementsOptions {
	readonly resource: MutationHelperResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

function isWpPostStorage(storage: unknown): storage is WpPostStorage {
	return (
		typeof storage === 'object' &&
		storage !== null &&
		'mode' in storage &&
		storage.mode === 'wp-post'
	);
}

export function buildWpPostGetRouteStatements(
	options: BuildWpPostGetRouteStatementsOptions
): PhpStmt[] | null {
	if (!isWpPostStorage(options.resource.storage)) {
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

	const identityGuardOptions: IdentityGuardOptions = isNumericIdentity(
		options.identity
	)
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
	const identityStatements =
		buildIdentityGuardStatements(identityGuardOptions);

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
