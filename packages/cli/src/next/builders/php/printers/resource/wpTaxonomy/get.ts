import {
	createArg,
	createAssign,
	createExpressionStatement,
	createIdentifier,
	createMethodCall,
	createReturn,
	createVariable,
	createFuncCall,
	createName,
	createScalarString,
} from '../../../ast/nodes';
import { createPrintable } from '../../../ast/printables';
import { PHP_INDENT, type PhpMethodBodyBuilder } from '../../../ast/templates';
import { appendResourceCacheEvent } from '../cache';
import { createWpErrorReturn } from '../errors';
import { buildInstanceof, buildBooleanNot, buildIfPrintable } from '../utils';
import type { ResourceMetadataHost } from '../../../ast/factories/cacheMetadata';
import type { IRResource } from '../../../../../../ir/types';
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

	const identityAssign = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('identity'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`validate${options.pascalName}Identity`),
					[
						createArg(
							createMethodCall(
								createVariable('request'),
								createIdentifier('get_param'),
								[
									createArg(
										createScalarString(
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
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('identity')),
		]),
		conditionText: `${indent}if ( is_wp_error( $identity ) ) {`,
		statements: [
			createPrintable(createReturn(createVariable('identity')), [
				`${childIndent}return $identity;`,
			]),
		],
	});
	options.body.statement(errorGuard);
	options.body.blank();

	const resolvePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('term'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`resolve${options.pascalName}Term`),
					[createArg(createVariable('identity'))]
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

	const returnPrintable = createPrintable(
		createReturn(
			createMethodCall(
				createVariable('this'),
				createIdentifier(`prepare${options.pascalName}TermResponse`),
				[createArg(createVariable('term'))]
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
		throw new Error('Expected wp-taxonomy storage configuration.');
	}
	return storage;
}
