import {
	buildArg,
	buildIfStatement,
	buildScalarBool,
	buildScalarInt,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildCachePrimingStatements,
	buildStatusValidationStatements,
	buildSyncMetaStatements,
	buildSyncTaxonomiesStatements,
	buildArrayDimExpression,
	buildVariableExpression,
} from '../macros';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildMethodCallAssignmentStatement,
	buildFunctionCallAssignmentStatement,
	buildVariableAssignment,
	normaliseVariableReference,
} from '../../../utils';
import { buildWpErrorReturn, buildReturnIfWpError } from '../../../errors';
import type { BuildCreateRouteStatementsOptions } from './types';
import { makeErrorCodeFactory } from '../../../../utils';

export function buildCreateRouteStatements(
	options: BuildCreateRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return null;
	}

	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);

	const statements: PhpStmt[] = [];

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post_type',
			subject: 'this',
			method: `get${options.pascalName}PostType`,
		})
	);

	statements.push(
		buildVariableAssignment(
			normaliseVariableReference('post_data'),
			buildArrayLiteral([
				{
					key: 'post_type',
					value: buildVariable('post_type'),
				},
			])
		)
	);

	statements.push(
		...buildStatusValidationStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			target: buildArrayDimExpression('post_data', 'post_status'),
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'post_id',
			functionName: 'wp_insert_post',
			args: [
				buildArg(buildVariable('post_data')),
				buildArg(buildScalarBool(true)),
			],
		})
	);

	statements.push(buildReturnIfWpError(buildVariable('post_id')));

	const insertFailedReturn = buildWpErrorReturn({
		code: errorCodeFactory('create_failed'),
		message: `Unable to create ${options.pascalName}.`,
		status: 500,
	});

	statements.push(
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarInt(0),
				buildVariable('post_id')
			),
			[insertFailedReturn]
		)
	);

	statements.push(
		...buildSyncMetaStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildVariableExpression('post_id'),
		})
	);

	statements.push(
		...buildSyncTaxonomiesStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildVariableExpression('post_id'),
			resultVariable: buildVariableExpression('taxonomy_result'),
		})
	);

	statements.push(
		...buildCachePrimingStatements({
			metadataKeys: options.metadataKeys,
			pascalName: options.pascalName,
			postId: buildVariableExpression('post_id'),
			errorCode: errorCodeFactory('load_failed'),
			failureMessage: `Unable to load created ${options.pascalName}.`,
		})
	);

	return statements;
}
