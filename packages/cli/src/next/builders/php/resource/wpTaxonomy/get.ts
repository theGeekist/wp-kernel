import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildReturn,
	buildVariable,
	buildFuncCall,
	buildName,
	buildScalarString,
	buildPrintable,
} from '@wpkernel/php-json-ast';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import { createWpErrorReturn } from '../errors';
import { buildInstanceof, buildBooleanNot, buildIfPrintable } from '../utils';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';

type WpTaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

export interface BuildWpTaxonomyGetRouteBodyOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly cacheSegments: readonly unknown[];
}

export function buildWpTaxonomyGetRouteBody(
	options: BuildWpTaxonomyGetRouteBodyOptions
): boolean {
	ensureStorage(options.resource);

	appendResourceCacheEvent({
		host: options.metadataHost,
		scope: 'get',
		operation: 'read',
		segments: options.cacheSegments,
		description: 'Get term request',
	});

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const childIndent = PHP_INDENT.repeat(indentLevel + 1);

	const identityAssign = buildPrintable(
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
		),
		[
			`${indent}$identity = $this->validate${options.pascalName}Identity( $request->get_param( '${options.identity.param}' ) );`,
		]
	);
	options.body.statement(identityAssign);

	const errorGuard = buildIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(buildVariable('identity')),
		]),
		conditionText: `${indent}if ( is_wp_error( $identity ) ) {`,
		statements: [
			buildPrintable(buildReturn(buildVariable('identity')), [
				`${childIndent}return $identity;`,
			]),
		],
	});
	options.body.statement(errorGuard);
	options.body.blank();

	const resolvePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('term'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`resolve${options.pascalName}Term`),
					[buildArg(buildVariable('identity'))]
				)
			)
		),
		[
			`${indent}$term = $this->resolve${options.pascalName}Term( $identity );`,
		]
	);
	options.body.statement(resolvePrintable);

	const notFoundReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: options.errorCodeFactory('not_found'),
		message: `Unable to locate ${options.pascalName} term.`,
		status: 404,
	});

	const guard = buildIfPrintable({
		indentLevel,
		condition: buildBooleanNot(buildInstanceof('term', 'WP_Term')),
		conditionText: `${indent}if ( ! ( $term instanceof WP_Term ) ) {`,
		statements: [notFoundReturn],
	});
	options.body.statement(guard);
	options.body.blank();

	const returnPrintable = buildPrintable(
		buildReturn(
			buildMethodCall(
				buildVariable('this'),
				buildIdentifier(`prepare${options.pascalName}TermResponse`),
				[buildArg(buildVariable('term'))]
			)
		),
		[
			`${indent}return $this->prepare${options.pascalName}TermResponse( $term );`,
		]
	);
	options.body.statement(returnPrintable);

	return true;
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
