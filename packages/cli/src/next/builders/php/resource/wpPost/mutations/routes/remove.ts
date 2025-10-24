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
	buildScalarString,
	buildVariable,
	PHP_INDENT,
	makeErrorCodeFactory,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from '../../../printer';
import { createIdentityValidationPrintables } from '../../identity';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
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

	const validationStatements = createIdentityValidationPrintables({
		identity: options.identity,
		indentLevel: options.indentLevel,
		pascalName: options.pascalName,
		errorCodeFactory,
	});

	for (const statement of validationStatements) {
		options.body.statement(statement);
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

	const notFoundReturn = createWpErrorReturn({
		indentLevel: options.indentLevel + 1,
		code: errorCodeFactory('not_found'),
		message: `${options.pascalName} not found.`,
		status: 404,
	});

	appendStatement(
		options,
		buildIfStatement(buildBooleanNot(buildInstanceof('post', 'WP_Post')), [
			notFoundReturn.node,
		])
	);
	options.body.blank();

	appendStatement(
		options,
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
		)
	);

	appendStatement(
		options,
		buildExpressionStatement(
			buildAssign(
				buildVariable('deleted'),
				buildFuncCall(buildName(['wp_delete_post']), [
					buildArg(buildPropertyFetch('post', 'ID')),
					buildArg(buildScalarBool(true)),
				])
			)
		)
	);

	const deleteReturn = createWpErrorReturn({
		indentLevel: options.indentLevel + 1,
		code: errorCodeFactory('delete_failed'),
		message: `Unable to delete ${options.pascalName}.`,
		status: 500,
	});

	appendStatement(
		options,
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarBool(false),
				buildVariable('deleted')
			),
			[deleteReturn.node]
		)
	);
	options.body.blank();

	appendStatement(
		options,
		buildReturn(
			buildArrayLiteral([
				{
					key: 'deleted',
					value: buildScalarBool(true),
				},
				{
					key: 'id',
					value: buildScalarCast(
						'int',
						buildPropertyFetch('post', 'ID')
					),
				},
				{
					key: 'previous',
					value: buildVariable('previous'),
				},
			])
		)
	);

	return true;
}

function appendStatement(
	options: BuildDeleteRouteBodyOptions,
	statement: PhpStmt
): void {
	options.body.statement(
		formatStatementPrintable(statement, {
			indentLevel: options.indentLevel,
			indentUnit: PHP_INDENT,
		})
	);
}
