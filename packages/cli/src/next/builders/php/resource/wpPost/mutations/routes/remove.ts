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
	makeErrorCodeFactory,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from '../../../printer';
import { buildIdentityValidationStatements } from '../../identity';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
} from '../../../utils';
import { buildWpErrorReturn } from '../../../errors';
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

	const deleteReturn = buildWpErrorReturn({
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
			[deleteReturn]
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
			indentUnit: options.body.getIndentUnit(),
		})
	);
}
