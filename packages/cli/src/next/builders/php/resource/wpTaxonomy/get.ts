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
	type PhpStmtExpression,
	type PhpStmtReturn,
	type PhpPrintable,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
	type PhpExpr,
	PHP_INDENT,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import { createWpErrorReturn } from '../errors';
import { buildInstanceof, buildBooleanNot, buildIfPrintable } from '../utils';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import { formatStatementPrintable } from '../printer';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildResolveTaxonomyTermCall,
} from './helpers';

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

	options.body.statement(
		createExpressionPrintable(
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
			),
			indentLevel
		)
	);

	const errorGuard = buildIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(buildVariable('identity')),
		]),
		statements: [
			createReturnPrintable(buildVariable('identity'), indentLevel + 1),
		],
	});
	options.body.statement(errorGuard);
	options.body.blank();

	options.body.statement(
		createExpressionPrintable(
			buildAssign(
				buildVariable('term'),
				buildResolveTaxonomyTermCall(options.pascalName)
			),
			indentLevel
		)
	);

	const notFoundReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: options.errorCodeFactory('not_found'),
		message: `Unable to locate ${options.pascalName} term.`,
		status: 404,
	});

	const guard = buildIfPrintable({
		indentLevel,
		condition: buildBooleanNot(buildInstanceof('term', 'WP_Term')),
		statements: [notFoundReturn],
	});
	options.body.statement(guard);
	options.body.blank();

	options.body.statement(
		createReturnPrintable(
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term'),
			indentLevel
		)
	);

	return true;
}

function createExpressionPrintable(
	expression: PhpExpr,
	indentLevel: number
): PhpPrintable<PhpStmtExpression> {
	const statement = buildExpressionStatement(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createReturnPrintable(
	expression: PhpExpr | null,
	indentLevel: number
): PhpPrintable<PhpStmtReturn> {
	const statement = buildReturn(expression);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
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
