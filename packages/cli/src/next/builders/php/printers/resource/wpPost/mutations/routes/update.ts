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
import { createIdentityValidationPrintables } from '../../identity';
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
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildInstanceof,
	buildPropertyFetch,
} from '../../../utils';
import { createWpErrorReturn } from '../../../errors';
import type { BuildUpdateRouteBodyOptions } from './types';

export function buildUpdateRouteBody(
	options: BuildUpdateRouteBodyOptions
): boolean {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return false;
	}

	const indentLevel = options.indentLevel;
	const indent = PHP_INDENT.repeat(indentLevel);
	const identityVar = options.identity.param;
	const errorCodeFactory = createErrorCodeFactory(options.resource.name);

	const identityPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable(identityVar),
				createMethodCall(
					createVariable('request'),
					createIdentifier('get_param'),
					[createArg(createScalarString(identityVar))]
				)
			)
		),
		[`${indent}$${identityVar} = $request->get_param( '${identityVar}' );`]
	);
	options.body.statement(identityPrintable);

	const validationStatements = createIdentityValidationPrintables({
		identity: options.identity,
		indentLevel,
		pascalName: options.pascalName,
		errorCodeFactory,
	});

	for (const statement of validationStatements) {
		options.body.statement(statement);
	}

	if (validationStatements.length > 0) {
		options.body.blank();
	}

	const resolvePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`resolve${options.pascalName}Post`),
					[createArg(createVariable(identityVar))]
				)
			)
		),
		[
			`${indent}$post = $this->resolve${options.pascalName}Post( $${identityVar} );`,
		]
	);
	options.body.statement(resolvePrintable);

	const notFoundReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	const notFoundGuard = buildIfPrintable({
		indentLevel,
		condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
		conditionText: `${indent}if ( ! $post instanceof WP_Post ) {`,
		statements: [notFoundReturn],
	});
	options.body.statement(notFoundGuard);
	options.body.blank();

	const postDataPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('post_data'),
				createArray([
					createArrayItem(buildPropertyFetch('post', 'ID'), {
						key: createScalarString('ID'),
					}),
					createArrayItem(
						createMethodCall(
							createVariable('this'),
							createIdentifier(
								`get${options.pascalName}PostType`
							),
							[]
						),
						{ key: createScalarString('post_type') }
					),
				])
			)
		),
		[
			`${indent}$post_data = array(`,
			`${indent}${PHP_INDENT}'ID' => $post->ID,`,
			`${indent}${PHP_INDENT}'post_type' => $this->get${options.pascalName}PostType(),`,
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
		guardWithNullCheck: true,
	});
	options.body.blank();

	const updatePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('result'),
				createFuncCall(createName(['wp_update_post']), [
					createArg(createVariable('post_data')),
					createArg(createScalarBool(true)),
				])
			)
		),
		[`${indent}$result = wp_update_post( $post_data, true );`]
	);
	options.body.statement(updatePrintable);

	const resultReturn = createPrintable(
		createReturn(createVariable('result')),
		[`${indent}${PHP_INDENT}return $result;`]
	);
	const resultGuard = buildIfPrintable({
		indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('result')),
		]),
		conditionText: `${indent}if ( is_wp_error( $result ) ) {`,
		statements: [resultReturn],
	});
	options.body.statement(resultGuard);

	const updateFailedReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: errorCodeFactory('update_failed'),
		message: `Unable to update ${options.pascalName}.`,
		status: 500,
	});

	const updateFailureGuard = buildIfPrintable({
		indentLevel,
		condition: buildBinaryOperation(
			'Identical',
			createScalarInt(0),
			createVariable('result')
		),
		conditionText: `${indent}if ( 0 === $result ) {`,
		statements: [updateFailedReturn],
	});
	options.body.statement(updateFailureGuard);
	options.body.blank();

	appendSyncMetaMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
		resultVariable: buildVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: buildPropertyExpression('post', 'ID'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load updated ${options.pascalName}.`,
		postVariableName: 'updated',
	});

	return true;
}
