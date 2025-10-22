import {
	createArg,
	createAssign,
	createArray,
	createArrayItem,
	createExpressionStatement,
	createFuncCall,
	createIdentifier,
	createMethodCall,
	createName,
	createReturn,
	createScalarBool,
	createScalarString,
	createVariable,
} from '@wpkernel/php-json-ast/nodes';
import {
	createPrintable,
	createErrorCodeFactory,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast/templates';
import { createIdentityValidationPrintables } from '../../identity';
import {
	buildBinaryOperation,
	buildBooleanNot,
	buildIfPrintable,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
} from '../../../utils';
import { createWpErrorReturn } from '../../../errors';
import type { BuildDeleteRouteBodyOptions } from './types';

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

	const notFoundGuard = buildIfPrintable({
		indentLevel,
		condition: buildBooleanNot(buildInstanceof('post', 'WP_Post')),
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
					createArg(buildPropertyFetch('post', 'ID')),
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

	const deleteGuard = buildIfPrintable({
		indentLevel,
		condition: buildBinaryOperation(
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
					buildScalarCast('int', buildPropertyFetch('post', 'ID')),
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
