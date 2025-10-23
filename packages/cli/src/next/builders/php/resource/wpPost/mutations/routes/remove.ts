import {
	buildArg,
	buildAssign,
	buildArray,
	buildArrayItem,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildReturn,
	buildScalarBool,
	buildScalarString,
	buildVariable,
	buildPrintable,
	PHP_INDENT,
	makeErrorCodeFactory,
} from '@wpkernel/php-json-ast';
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
	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);

	const identityPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable(identityVar),
				buildMethodCall(
					buildVariable('request'),
					buildIdentifier('get_param'),
					[buildArg(buildScalarString(identityVar))]
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

	const resolvePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('post'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`resolve${options.pascalName}Post`),
					[buildArg(buildVariable(identityVar))]
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

	const previousPrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('previous'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`prepare${options.pascalName}Response`),
					[
						buildArg(buildVariable('post')),
						buildArg(buildVariable('request')),
					]
				)
			)
		),
		[
			`${indent}$previous = $this->prepare${options.pascalName}Response( $post, $request );`,
		]
	);
	options.body.statement(previousPrintable);

	const deletePrintable = buildPrintable(
		buildExpressionStatement(
			buildAssign(
				buildVariable('deleted'),
				buildFuncCall(buildName(['wp_delete_post']), [
					buildArg(buildPropertyFetch('post', 'ID')),
					buildArg(buildScalarBool(true)),
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
			buildScalarBool(false),
			buildVariable('deleted')
		),
		conditionText: `${indent}if ( false === $deleted ) {`,
		statements: [deleteReturn],
	});
	options.body.statement(deleteGuard);
	options.body.blank();

	const responsePrintable = buildPrintable(
		buildReturn(
			buildArray([
				buildArrayItem(buildScalarBool(true), {
					key: buildScalarString('deleted'),
				}),
				buildArrayItem(
					buildScalarCast('int', buildPropertyFetch('post', 'ID')),
					{ key: buildScalarString('id') }
				),
				buildArrayItem(buildVariable('previous'), {
					key: buildScalarString('previous'),
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
