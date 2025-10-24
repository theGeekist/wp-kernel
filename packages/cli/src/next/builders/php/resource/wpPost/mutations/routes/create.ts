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
	buildVariable,
	makeErrorCodeFactory,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from '../../../printer';
import {
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	buildArrayDimExpression,
	buildVariableExpression,
} from '../macros';
import { buildArrayLiteral, buildBinaryOperation } from '../../../utils';
import { buildWpErrorReturn } from '../../../errors';
import type { BuildCreateRouteBodyOptions } from './types';

export function buildCreateRouteBody(
	options: BuildCreateRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return false;
	}

	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);

	appendStatement(
		options,
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_type'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		)
	);
	options.body.blank();

	appendStatement(
		options,
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_data'),
				buildArrayLiteral([
					{
						key: 'post_type',
						value: buildVariable('post_type'),
					},
				])
			)
		)
	);

	appendStatusValidationMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		target: buildArrayDimExpression('post_data', 'post_status'),
	});
	options.body.blank();

	appendStatement(
		options,
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_id'),
				buildFuncCall(buildName(['wp_insert_post']), [
					buildArg(buildVariable('post_data')),
					buildArg(buildScalarBool(true)),
				])
			)
		)
	);

	appendStatement(
		options,
		buildIfStatement(
			buildFuncCall(buildName(['is_wp_error']), [
				buildArg(buildVariable('post_id')),
			]),
			[buildReturn(buildVariable('post_id'))]
		)
	);

	const insertFailedReturn = buildWpErrorReturn({
		code: errorCodeFactory('create_failed'),
		message: `Unable to create ${options.pascalName}.`,
		status: 500,
	});

	appendStatement(
		options,
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarInt(0),
				buildVariable('post_id')
			),
			[insertFailedReturn]
		)
	);
	options.body.blank();

	appendSyncMetaMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
		resultVariable: buildVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load created ${options.pascalName}.`,
	});

	return true;
}

function appendStatement(
	options: BuildCreateRouteBodyOptions,
	statement: PhpStmt
): void {
	options.body.statement(
		formatStatementPrintable(statement, {
			indentLevel: options.indentLevel,
			indentUnit: options.body.getIndentUnit(),
		})
	);
}
