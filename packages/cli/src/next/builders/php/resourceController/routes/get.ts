import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildVariable,
	buildPrintable,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import {
	appendResourceCacheEvent,
	buildBooleanNot,
	createIdentityValidationPrintables,
	buildIfPrintable,
	buildInstanceof,
	createWpErrorReturn,
	buildWpTaxonomyGetRouteBody,
} from '../../resource';
import type { ResolvedIdentity } from '../../identity';
import type { IRResource } from '../../../../../ir/types';

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
	if (!storage) {
		return false;
	}

	if (storage.mode === 'wp-taxonomy') {
		return buildWpTaxonomyGetRouteBody({
			body: options.body,
			indentLevel: options.indentLevel,
			resource: options.resource,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: options.metadataHost,
			cacheSegments: options.cacheSegments,
		});
	}

	if (storage.mode !== 'wp-post') {
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

	const resolvePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`resolve${options.pascalName}Post`),
					[buildArg(buildVariable(param))]
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

	const returnPrintable = buildPrintable(
		buildReturn(
			buildMethodCall(
				buildVariable('this'),
				buildIdentifier(`prepare${options.pascalName}Response`),
				[
					buildArg(buildVariable('post')),
					buildArg(buildVariable('request')),
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
