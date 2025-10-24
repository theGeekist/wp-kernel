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
import { formatStatementPrintable } from '../../../printer';
import { buildIdentityValidationStatements } from '../../identity';
import {
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
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
import type { BuildUpdateRouteBodyOptions } from './types';

export function buildUpdateRouteBody(
	options: BuildUpdateRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return false;
	}

	const identityVar = options.identity.param;
	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);

	appendStatement(
		options,
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

	for (const statement of validationStatements) {
		appendStatement(options, statement);
	}

	if (validationStatements.length > 0) {
		options.body.blank();
	}

	appendStatement(
		options,
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

	appendStatement(
		options,
		buildIfStatement(buildBooleanNot(buildInstanceof('post', 'WP_Post')), [
			notFoundReturn,
		])
	);
	options.body.blank();

	appendStatement(
		options,
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

	appendStatusValidationMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		target: buildArrayDimExpression('post_data', 'post_status'),
		guardWithNullCheck: true,
	});
	options.body.blank();

	appendStatement(
		options,
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

	appendStatement(
		options,
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

	appendStatement(
		options,
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarInt(0),
				buildVariable('result')
			),
			[updateFailedReturn]
		)
	);
	options.body.blank();

	appendSyncMetaMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
		resultVariable: buildVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel: options.indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load updated ${options.pascalName}.`,
		postVariableName: 'updated',
	});

	return true;
}

function appendStatement(
	options: BuildUpdateRouteBodyOptions,
	statement: PhpStmt
): void {
	options.body.statement(
		formatStatementPrintable(statement, {
			indentLevel: options.indentLevel,
			indentUnit: options.body.getIndentUnit(),
		})
	);
}
