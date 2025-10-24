import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildReturn,
	buildVariable,
	buildScalarString,
	type PhpMethodBodyBuilder,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { appendResourceCacheEvent } from '../cache';
import { buildWpErrorReturn } from '../errors';
import {
	buildBooleanNot,
	buildIfStatementNode,
	buildInstanceof,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../utils';
import type { IRResource } from '../../../../../ir/types';
import type { ResolvedIdentity } from '../../identity';
import {
	buildPrepareTaxonomyTermResponseCall,
	buildResolveTaxonomyTermCall,
	createTaxonomyAssignmentStatement,
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

	const identityVar = normaliseVariableReference('identity');

	options.body.statementNode(
		buildVariableAssignment(
			identityVar,
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
									buildScalarString(options.identity.param)
								),
							]
						)
					),
				]
			)
		)
	);

	options.body.statementNode(
		buildIfStatementNode({
			condition: buildFuncCall(buildName(['is_wp_error']), [
				buildArg(buildVariable(identityVar.raw)),
			]),
			statements: [buildReturn(buildVariable(identityVar.raw))],
		})
	);

	options.body.statementNode(
		createTaxonomyAssignmentStatement({
			pascalName: options.pascalName,
		})
	);

	options.body.statementNode(
		buildVariableAssignment(
			normaliseVariableReference('term'),
			buildResolveTaxonomyTermCall(options.pascalName)
		)
	);

	const notFoundReturn = buildWpErrorReturn({
		code: options.errorCodeFactory('not_found'),
		message: `Unable to locate ${options.pascalName} term.`,
		status: 404,
	});

	options.body.statementNode(
		buildIfStatementNode({
			condition: buildBooleanNot(buildInstanceof('term', 'WP_Term')),
			statements: [notFoundReturn],
		})
	);

	options.body.statementNode(
		buildReturn(
			buildPrepareTaxonomyTermResponseCall(options.pascalName, 'term')
		)
	);

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
