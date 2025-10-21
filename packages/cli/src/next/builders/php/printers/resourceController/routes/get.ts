import {
	createArg,
	createAssign,
	createExpressionStatement,
	createIdentifier,
	createMethodCall,
	createReturn,
	createVariable,
} from '../../../ast/nodes';
import { createPrintable } from '../../../ast/printables';
import { PHP_INDENT, type PhpMethodBodyBuilder } from '../../../ast/templates';
import {
	appendResourceCacheEvent,
	buildBooleanNot,
	createIdentityValidationPrintables,
	buildIfPrintable,
	buildInstanceof,
	createWpErrorReturn,
} from '../../resource';
import type { ResourceMetadataHost } from '../../../ast/factories/cacheMetadata';
import type { ResolvedIdentity } from '../../identity';
import type { IRResource } from '../../../../../../ir/types';

export interface BuildGetRouteBodyOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildGetRouteBody(options: BuildGetRouteBodyOptions): boolean {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return false;
	}

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'Get request',
	});

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const param = options.identity.param;
	const variableName = `$${param}`;

	const identityStatements = createIdentityValidationPrintables({
		identity: options.identity,
		indentLevel,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
	});

	for (const statement of identityStatements) {
		options.body.statement(statement);
	}

	if (identityStatements.length > 0) {
		options.body.blank();
	}

	const resolvePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`resolve${options.pascalName}Post`),
					[createArg(createVariable(param))]
				)
			)
		),
		[
			`${indent}$post = $this->resolve${options.pascalName}Post( ${variableName} );`,
		]
	);
	options.body.statement(resolvePrintable);

	const notFoundReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: options.errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	const notFoundIf = buildIfPrintable({
		indentLevel,
		condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
		conditionText: `${indent}if ( ! $post instanceof WP_Post ) {`,
		statements: [notFoundReturn],
	});
	options.body.statement(notFoundIf);
	options.body.blank();

	const returnPrintable = createPrintable(
		createReturn(
			createMethodCall(
				createVariable('this'),
				createIdentifier(`prepare${options.pascalName}Response`),
				[
					createArg(createVariable('post')),
					createArg(createVariable('request')),
				]
			)
		),
		[
			`${indent}return $this->prepare${options.pascalName}Response( $post, $request );`,
		]
	);
	options.body.statement(returnPrintable);

	return true;
}
