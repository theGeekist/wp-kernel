import {
	buildArg,
	buildAssign,
	buildClassMethod,
	buildDocComment,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildParam,
	buildScalarString,
	buildStaticCall,
	buildStmtNop,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpAttributes,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import { buildRequestParamAssignmentStatement } from '../common/request';
import { buildReturnIfWpError } from '../common/wpError';
import { buildIdentityPlumbing } from './identity';

import type {
	RestControllerIdentity,
	RestRouteConfig,
	RestRouteRequestParameter,
} from './types';

export function buildRestRoute(
	config: RestRouteConfig,
	identity: RestControllerIdentity
): PhpStmtClassMethod {
	const statements: PhpStmt[] = [];

	appendRequestHandling(statements, { identity, route: config });

	if (config.policy) {
		const assignment = buildStaticCall(
			buildName(['Policy']),
			buildIdentifier('enforce'),
			[
				buildArg(buildScalarString(config.policy)),
				buildArg(buildVariable('request')),
			]
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(buildVariable('permission'), assignment)
			)
		);
		statements.push(buildReturnIfWpError(buildVariable('permission')));
		statements.push(buildStmtNop());
	}

	statements.push(...config.statements);

	const attributes = buildDocAttributes([
		buildSummaryLine(config),
		`@wp-kernel route-kind ${config.metadata.kind}`,
		...buildTagDocblock(config.metadata.tags),
	]);

	return buildClassMethod(
		buildIdentifier(config.methodName),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			params: [
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			stmts: statements,
		},
		attributes
	);
}

interface AppendRequestHandlingOptions {
	readonly identity: RestControllerIdentity;
	readonly route: RestRouteConfig;
}

function appendRequestHandling(
	statements: PhpStmt[],
	options: AppendRequestHandlingOptions
): void {
	const identityStatements = buildIdentityPlumbing({
		identity: options.identity,
		route: options.route,
	});
	const parameterStatements = buildRequestParameterStatements(
		options.route.requestParameters
	);

	if (identityStatements.length === 0 && parameterStatements.length === 0) {
		return;
	}

	statements.push(...identityStatements);
	statements.push(...parameterStatements);
	statements.push(buildStmtNop());
}

function buildRequestParameterStatements(
	parameters: readonly RestRouteRequestParameter[] | undefined
): PhpStmt[] {
	if (!parameters || parameters.length === 0) {
		return [];
	}

	return parameters.map((parameter) =>
		buildRequestParamAssignmentStatement({
			requestVariable: parameter.requestVariable ?? 'request',
			param: parameter.param,
			targetVariable: parameter.targetVariable,
			cast: parameter.cast,
		})
	);
}

function buildDocAttributes(
	lines: readonly (string | undefined)[]
): PhpAttributes | undefined {
	const docLines = lines.filter(Boolean) as string[];
	if (docLines.length === 0) {
		return undefined;
	}

	return { comments: [buildDocComment(docLines)] };
}

function buildSummaryLine(config: RestRouteConfig): string {
	if (config.docblockSummary) {
		return config.docblockSummary;
	}

	return `Handle [${config.metadata.method}] ${config.metadata.path}.`;
}

function buildTagDocblock(
	tags: RestRouteConfig['metadata']['tags']
): readonly string[] {
	if (!tags) {
		return [];
	}

	return Object.entries(tags)
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, value]) => `@wp-kernel ${key} ${value}`);
}
