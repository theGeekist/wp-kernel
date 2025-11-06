import {
	buildArg,
	buildIfStatement,
	buildScalarBool,
	buildScalarInt,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import {
	buildIdentityGuardStatements,
	isNumericIdentity,
	type IdentityGuardOptions,
} from '../../../../pipeline/identity';
import {
	buildCachePrimingStatements,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildArrayDimExpression,
	buildPropertyExpression,
	buildVariableExpression,
} from '../../mutation';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
	buildFunctionCallAssignmentStatement,
	buildMethodCallAssignmentStatement,
	buildMethodCallExpression,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../../common/utils';
import { buildReturnIfWpError, buildWpErrorReturn } from '../../../errors';
import { buildRequestParamAssignmentStatement } from '../../../../common/request';
import type { BuildUpdateRouteStatementsOptions } from './types';
import { makeErrorCodeFactory } from './utils';

/**
 * @param    options
 * @category WordPress AST
 */
export function buildUpdateRouteStatements(
	options: BuildUpdateRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return null;
	}

	const identityVar = options.identity.param;
	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);
	const statements: PhpStmt[] = [];

	statements.push(
		buildRequestParamAssignmentStatement({
			requestVariable: 'request',
			param: identityVar,
			targetVariable: identityVar,
		})
	);

	const identityOptions: IdentityGuardOptions = isNumericIdentity(
		options.identity
	)
		? {
				identity: options.identity,
				pascalName: options.pascalName,
				errorCodeFactory,
			}
		: {
				identity: options.identity,
				pascalName: options.pascalName,
				errorCodeFactory,
			};
	const validationStatements = buildIdentityGuardStatements(identityOptions);
	statements.push(...validationStatements);

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post',
			subject: 'this',
			method: `resolve${options.pascalName}Post`,
			args: [buildArg(buildVariable(identityVar))],
		})
	);

	const notFoundReturn = buildWpErrorReturn({
		code: errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});
	statements.push(
		buildIfStatement(buildBooleanNot(buildInstanceof('post', 'WP_Post')), [
			notFoundReturn,
		])
	);

	statements.push(
		buildVariableAssignment(
			normaliseVariableReference('post_data'),
			buildArrayLiteral([
				{
					key: 'ID',
					value: buildPropertyFetch('post', 'ID'),
				},
				{
					key: 'post_type',
					value: buildMethodCallExpression({
						subject: 'this',
						method: `get${options.pascalName}PostType`,
					}),
				},
			])
		)
	);

	statements.push(
		...buildStatusValidationStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			target: buildArrayDimExpression('post_data', 'post_status'),
			guardWithNullCheck: true,
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'result',
			functionName: 'wp_update_post',
			args: [
				buildArg(buildVariable('post_data')),
				buildArg(buildScalarBool(true)),
			],
		})
	);

	statements.push(buildReturnIfWpError(buildVariable('result')));

	const updateFailedReturn = buildWpErrorReturn({
		code: errorCodeFactory('update_failed'),
		message: `Unable to update ${options.pascalName}.`,
		status: 500,
	});
	statements.push(
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarInt(0),
				buildVariable('result')
			),
			[updateFailedReturn]
		)
	);

	statements.push(
		...buildSyncMetaStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildPropertyExpression('post', 'ID'),
		})
	);

	statements.push(
		...buildSyncTaxonomiesStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildPropertyExpression('post', 'ID'),
			resultVariable: buildVariableExpression('taxonomy_result'),
		})
	);

	statements.push(
		...buildCachePrimingStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildPropertyExpression('post', 'ID'),
			errorCode: errorCodeFactory('load_failed'),
			failureMessage: `Unable to load updated ${options.pascalName}.`,
			postVariableName: 'updated',
		})
	);

	return statements;
}
