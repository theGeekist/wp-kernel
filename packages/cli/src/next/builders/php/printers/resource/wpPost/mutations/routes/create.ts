import {
	createArg,
	createArray,
	createArrayItem,
	createAssign,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createReturn,
	createScalarBool,
	createScalarInt,
	createScalarString,
	createVariable,
} from '../../../../../ast/nodes';
import { createPrintable } from '../../../../../ast/printables';
import { PHP_INDENT } from '../../../../../ast/templates';
import { createErrorCodeFactory } from '../../../../../ast/utils';
import {
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	createArrayDimExpression,
	createVariableExpression,
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
	const errorCodeFactory = createErrorCodeFactory(options.resource.name);

	const postTypePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post_type'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`get${options.pascalName}PostType`),
					[]
				)
			)
		),
		[`${indent}$post_type = $this->get${options.pascalName}PostType();`]
	);
	options.body.statement(postTypePrintable);
	options.body.blank();

	const postDataPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post_data'),
				createArray([
					createArrayItem(createVariable('post_type'), {
						key: createScalarString('post_type'),
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
		target: createArrayDimExpression('post_data', 'post_status'),
	});
	options.body.blank();

	const insertPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post_id'),
				createFuncCall(createName(['wp_insert_post']), [
					createArg(createVariable('post_data')),
					createArg(createScalarBool(true)),
				])
			)
		),
		[`${indent}$post_id = wp_insert_post( $post_data, true );`]
	);
	options.body.statement(insertPrintable);

	const insertReturn = createPrintable(
		createReturn(createVariable('post_id')),
		[`${indent}${PHP_INDENT}return $post_id;`]
	);
	const insertGuard = buildIfPrintable({
		indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('post_id')),
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
			createScalarInt(0),
			createVariable('post_id')
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
		postId: createVariableExpression('post_id'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: createVariableExpression('post_id'),
		resultVariable: createVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: createVariableExpression('post_id'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load created ${options.pascalName}.`,
	});

	return true;
}
