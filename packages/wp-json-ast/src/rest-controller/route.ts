import {
	buildArg,
	buildAssign,
	buildClassMethod,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildParam,
	buildScalarString,
	buildStaticCall,
	buildStmtNop,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import { buildRequestParamAssignmentStatement } from '../common/request';
import { buildReturnIfWpError } from '../common/guards';
import { buildDocCommentAttributes } from '../common/docblock';
import { buildIdentityPlumbing } from './identity';

import type {
	RestRouteConfig,
	RestRouteIdentityPlan,
	RestRouteRequestParameter,
} from './types';

/**
 * @param    plan
 * @category WordPress AST
 */
export function buildRestRoute(
	plan: RestRouteIdentityPlan
): PhpStmtClassMethod {
	const statements = buildRouteStatements(plan);
	const attributes = buildRouteAttributes(plan.route);

	return buildClassMethod(
		buildIdentifier(plan.route.methodName),
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

function buildRouteStatements(plan: RestRouteIdentityPlan): PhpStmt[] {
	const requestHandling = buildRequestHandlingStatements(plan);
	const capabilityGuard = buildCapabilityGuardStatements(
		plan.route.capability
	);

	return [...requestHandling, ...capabilityGuard, ...plan.route.statements];
}

function buildRouteAttributes(route: RestRouteConfig) {
	return buildDocCommentAttributes([
		buildSummaryLine(route),
		`@wp-kernel route-kind ${route.metadata.kind}`,
		...buildTagDocblock(route.metadata.tags),
	]);
}

function buildCapabilityGuardStatements(capability?: string): PhpStmt[] {
	if (!capability) {
		return [];
	}

	const assignment = buildStaticCall(
		buildName(['Capability']),
		buildIdentifier('enforce'),
		[
			buildArg(buildScalarString(capability)),
			buildArg(buildVariable('request')),
		]
	);

	return [
		buildExpressionStatement(
			buildAssign(buildVariable('permission'), assignment)
		),
		buildReturnIfWpError(buildVariable('permission')),
		buildStmtNop(),
	];
}

function buildRequestHandlingStatements(
	plan: RestRouteIdentityPlan
): PhpStmt[] {
	const identityStatements = buildIdentityPlumbing(plan);
	const parameterStatements = buildRequestParameterStatements(
		plan.route.requestParameters
	);

	if (identityStatements.length === 0 && parameterStatements.length === 0) {
		return [];
	}

	return [...identityStatements, ...parameterStatements, buildStmtNop()];
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

function buildSummaryLine(route: RestRouteConfig): string {
	if (route.docblockSummary) {
		return route.docblockSummary;
	}

	return `Handle [${route.metadata.method}] ${route.metadata.path}.`;
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
