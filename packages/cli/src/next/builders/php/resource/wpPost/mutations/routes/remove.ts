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
import type { BuildDeleteRouteStatementsOptions } from './types';

export function buildDeleteRouteStatements(
	options: BuildDeleteRouteStatementsOptions
): PhpStmt[] | null {
	const storage = options.resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		return null;
	}

	const identityVar = options.identity.param;
	const errorCodeFactory = makeErrorCodeFactory(options.resource.name);
	const statements: PhpStmt[] = [];

	statements.push(
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
	statements.push(...validationStatements);

	statements.push(
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
	statements.push(
		buildIfStatement(buildBooleanNot(buildInstanceof('post', 'WP_Post')), [
			notFoundReturn,
		])
	);

	statements.push(
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

	statements.push(
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
	statements.push(
		buildIfStatement(
			buildBinaryOperation(
				'Identical',
				buildScalarBool(false),
				buildVariable('deleted')
			),
			[deleteReturn]
		)
	);

	statements.push(
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

	return statements;
}
