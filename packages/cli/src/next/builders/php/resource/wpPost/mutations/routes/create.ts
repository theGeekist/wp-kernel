import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildPrintable,
	PHP_INDENT,
	makeErrorCodeFactory,
} from '@wpkernel/php-json-ast';
import {
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	buildArrayDimExpression,
	buildVariableExpression,
} from '../macros';
import { buildBinaryOperation, buildIfPrintable } from '../../../utils';
import { createWpErrorReturn } from '../../../errors';
import type { BuildCreateRouteBodyOptions } from './types';

export function buildCreateRouteBody(
	options: BuildCreateRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return false;
	}

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);

	const postTypePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_type'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		),
		[`${indent}$post_type = $this->get${options.pascalName}PostType();`]
	);
	options.body.statement(postTypePrintable);
	options.body.blank();

	const postDataPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_data'),
				buildArray([
					buildArrayItem(buildVariable('post_type'), {
						key: buildScalarString('post_type'),
					}),
				])
			)
		),
		[
			`${indent}$post_data = array(`,
			`${indent}${PHP_INDENT}'post_type' => $post_type,`,
			`${indent});`,
		]
	);
	options.body.statement(postDataPrintable);

	appendStatusValidationMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		target: buildArrayDimExpression('post_data', 'post_status'),
	});
	options.body.blank();

	const insertPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post_id'),
				buildFuncCall(buildName(['wp_insert_post']), [
					buildArg(buildVariable('post_data')),
					buildArg(buildScalarBool(true)),
				])
			)
		),
		[`${indent}$post_id = wp_insert_post( $post_data, true );`]
	);
	options.body.statement(insertPrintable);

	const insertReturn = buildPrintable(buildReturn(buildVariable('post_id')), [
		`${indent}${PHP_INDENT}return $post_id;`,
	]);
	const insertGuard = buildIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['is_wp_error']), [
			buildArg(buildVariable('post_id')),
		]),
		conditionText: `${indent}if ( is_wp_error( $post_id ) ) {`,
		statements: [insertReturn],
	});
	options.body.statement(insertGuard);

	const insertFailedReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: errorCodeFactory('create_failed'),
		message: `Unable to create ${options.pascalName}.`,
		status: 500,
	});

	const insertFailureGuard = buildIfPrintable({
		indentLevel,
		condition: buildBinaryOperation(
			'Identical',
			buildScalarInt(0),
			buildVariable('post_id')
		),
		conditionText: `${indent}if ( 0 === $post_id ) {`,
		statements: [insertFailedReturn],
	});
	options.body.statement(insertFailureGuard);
	options.body.blank();

	appendSyncMetaMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
		resultVariable: buildVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildVariableExpression('post_id'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load created ${options.pascalName}.`,
	});

	return true;
}
