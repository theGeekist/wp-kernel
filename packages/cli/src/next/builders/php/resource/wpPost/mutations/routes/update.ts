import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	makeErrorCodeFactory,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildIdentityValidationStatements } from '../../identity';
import {
	buildCachePrimingStatements,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildArrayDimExpression,
	buildPropertyExpression,
	buildVariableExpression,
} from '../macros';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
} from '../../../utils';
import { buildWpErrorReturn } from '../../../errors';
import type { BuildUpdateRouteStatementsOptions } from './types';

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
		buildExpressionStatement(
			buildAssign(
				buildVariable(identityVar),
				buildMethodCall(
					buildVariable('request'),
					buildIdentifier('get_param'),
					[buildArg(buildScalarString(identityVar))]
				)
			)
		)
	);

	const validationStatements = buildIdentityValidationStatements({
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory,
	});
	statements.push(...validationStatements);

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`resolve${options.pascalName}Post`),
					[buildArg(buildVariable(identityVar))]
				)
			)
		)
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
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_data'),
				buildArrayLiteral([
					{
						key: 'ID',
						value: buildPropertyFetch('post', 'ID'),
					},
					{
						key: 'post_type',
						value: buildMethodCall(
							buildVariable('this'),
							buildIdentifier(`get${options.pascalName}PostType`),
							[]
						),
					},
				])
			)
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
		buildExpressionStatement(
			buildAssign(
				buildVariable('result'),
				buildFuncCall(buildName(['wp_update_post']), [
					buildArg(buildVariable('post_data')),
					buildArg(buildScalarBool(true)),
				])
			)
		)
	);

	statements.push(
		buildIfStatement(
			buildFuncCall(buildName(['is_wp_error']), [
				buildArg(buildVariable('result')),
			]),
			[buildReturn(buildVariable('result'))]
		)
	);

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
