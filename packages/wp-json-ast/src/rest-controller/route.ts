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

import type { RestRouteConfig, RestRouteRequestParameter } from './types';

export function buildRestRoute(config: RestRouteConfig): PhpStmtClassMethod {
	const statements: PhpStmt[] = [];

	appendRequestParameters(statements, config.requestParameters);

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

function appendRequestParameters(
	statements: PhpStmt[],
	parameters: readonly RestRouteRequestParameter[] | undefined
): void {
	if (!parameters || parameters.length === 0) {
		return;
	}

	for (const parameter of parameters) {
		statements.push(
			buildRequestParamAssignmentStatement({
				requestVariable: parameter.requestVariable ?? 'request',
				param: parameter.param,
				targetVariable: parameter.targetVariable,
				cast: parameter.cast,
			})
		);
	}

	statements.push(buildStmtNop());
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
