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
	createNode,
	createReturn,
	createScalarBool,
	createScalarString,
	createVariable,
	type PhpExprBooleanNot,
} from '../../../../ast/nodes';
import { createPrintable } from '../../../../ast/printables';
import {
	PHP_INDENT,
	type PhpMethodBodyBuilder,
} from '../../../../ast/templates';
import { createErrorCodeFactory } from '../../../../ast/utils';
import type { IRResource } from '../../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../identity';
import { createIdentityValidationPrintables } from '../../wpPost/identity';
import {
	appendCachePrimingMacro,
	appendStatusValidationMacro,
	appendSyncMetaMacro,
	appendSyncTaxonomiesMacro,
	createArrayDimExpression,
	createPropertyExpression,
	createVariableExpression,
} from './macros';
import {
	createIfPrintable,
	createInstanceof,
	createBinaryOperation,
	createScalarCast,
	createPropertyFetch,
} from '../../utils';
import { createWpErrorReturn } from '../../errors';
import type { ResourceMutationContract } from '../../mutationContract';

export interface BuildMutationRouteBodyBaseOptions {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly metadataKeys: ResourceMutationContract['metadataKeys'];
}

export type BuildCreateRouteBodyOptions = BuildMutationRouteBodyBaseOptions;

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
	const insertGuard = createIfPrintable({
		indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('post_id')),
		]),
		conditionText: `${indent}if ( is_wp_error( $post_id ) ) {`,
		statements: [insertReturn],
	});
	options.body.statement(insertGuard);
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

export interface BuildUpdateRouteBodyOptions
	extends BuildMutationRouteBodyBaseOptions {
	readonly identity: ResolvedIdentity;
}

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

	const notFoundGuard = createIfPrintable({
		indentLevel,
		condition: createBooleanNot(createInstanceof('post', 'WP_Post')),
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
					createArrayItem(createPropertyFetch('post', 'ID'), {
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
		target: createArrayDimExpression('post_data', 'post_status'),
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
	const resultGuard = createIfPrintable({
		indentLevel,
		condition: createFuncCall(createName(['is_wp_error']), [
			createArg(createVariable('result')),
		]),
		conditionText: `${indent}if ( is_wp_error( $result ) ) {`,
		statements: [resultReturn],
	});
	options.body.statement(resultGuard);
	options.body.blank();

	appendSyncMetaMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: createPropertyExpression('post', 'ID'),
	});

	appendSyncTaxonomiesMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: createPropertyExpression('post', 'ID'),
		resultVariable: createVariableExpression('taxonomy_result'),
	});

	appendCachePrimingMacro({
		body: options.body,
		indentLevel,
		metadataKeys: options.metadataKeys,
		pascalName: options.pascalName,
		postId: createPropertyExpression('post', 'ID'),
		errorCode: errorCodeFactory('load_failed'),
		failureMessage: `Unable to load updated ${options.pascalName}.`,
		postVariableName: 'updated',
	});

	return true;
}

export interface BuildDeleteRouteBodyOptions
	extends BuildMutationRouteBodyBaseOptions {
	readonly identity: ResolvedIdentity;
}

export function buildDeleteRouteBody(
	options: BuildDeleteRouteBodyOptions
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

	const notFoundGuard = createIfPrintable({
		indentLevel,
		condition: createBooleanNot(createInstanceof('post', 'WP_Post')),
		conditionText: `${indent}if ( ! $post instanceof WP_Post ) {`,
		statements: [notFoundReturn],
	});
	options.body.statement(notFoundGuard);
	options.body.blank();

	const previousPrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('previous'),
				createMethodCall(
					createVariable('this'),
					createIdentifier(`prepare${options.pascalName}Response`),
					[
						createArg(createVariable('post')),
						createArg(createVariable('request')),
					]
				)
			)
		),
		[
			`${indent}$previous = $this->prepare${options.pascalName}Response( $post, $request );`,
		]
	);
	options.body.statement(previousPrintable);

	const deletePrintable = createPrintable(
		createExpressionStatement(
			createAssign(
				createVariable('deleted'),
				createFuncCall(createName(['wp_delete_post']), [
					createArg(createPropertyFetch('post', 'ID')),
					createArg(createScalarBool(true)),
				])
			)
		),
		[`${indent}$deleted = wp_delete_post( $post->ID, true );`]
	);
	options.body.statement(deletePrintable);

	const deleteReturn = createWpErrorReturn({
		indentLevel: indentLevel + 1,
		code: errorCodeFactory('delete_failed'),
		message: `Unable to delete ${options.pascalName}.`,
		status: 500,
	});

	const deleteGuard = createIfPrintable({
		indentLevel,
		condition: createBinaryOperation(
			'Identical',
			createScalarBool(false),
			createVariable('deleted')
		),
		conditionText: `${indent}if ( false === $deleted ) {`,
		statements: [deleteReturn],
	});
	options.body.statement(deleteGuard);
	options.body.blank();

	const responsePrintable = createPrintable(
		createReturn(
			createArray([
				createArrayItem(createScalarBool(true), {
					key: createScalarString('deleted'),
				}),
				createArrayItem(
					createScalarCast('int', createPropertyFetch('post', 'ID')),
					{ key: createScalarString('id') }
				),
				createArrayItem(createVariable('previous'), {
					key: createScalarString('previous'),
				}),
			])
		),
		[
			`${indent}return array(`,
			`${indent}${PHP_INDENT}'deleted' => true,`,
			`${indent}${PHP_INDENT}'id' => (int) $post->ID,`,
			`${indent}${PHP_INDENT}'previous' => $previous,`,
			`${indent});`,
		]
	);
	options.body.statement(responsePrintable);

	return true;
}

function createBooleanNot(expr: ReturnType<typeof createInstanceof>) {
	return createNode<PhpExprBooleanNot>('Expr_BooleanNot', { expr });
}
