import {
	buildArg,
	buildIfStatement,
	buildReturn,
	buildScalarBool,
	buildVariable,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildIdentityValidationStatements,
	type IdentityValidationOptions,
} from '../../identity';
import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
	buildScalarCast,
	buildMethodCallAssignmentStatement,
	buildFunctionCallAssignmentStatement,
} from '../../../utils';
import { buildWpErrorReturn } from '../../../errors';
import { buildRequestParamAssignmentStatement } from '../../../request';
import type { BuildDeleteRouteStatementsOptions } from './types';
import { makeErrorCodeFactory } from '../../../../utils';

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
		buildRequestParamAssignmentStatement({
			requestVariable: 'request',
			param: identityVar,
			targetVariable: identityVar,
		})
	);

	const identityValidationOptions: IdentityValidationOptions =
		options.identity.type === 'string'
			? {
					identity: options.identity,
					pascalName: options.pascalName,
					errorCodeFactory,
				}
			: {
					identity: options.identity,
					pascalName: options.pascalName,
					errorCodeFactory,
				};

	const validationStatements = buildIdentityValidationStatements(
		identityValidationOptions
	);
	statements.push(...validationStatements);

	statements.push(
		buildMethodCallAssignmentStatement({
			variable: 'post',
			subject: 'this',
			method: `resolve${options.pascalName}Post`,
			args: [buildArg(buildVariable(identityVar))],
		})
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
		buildMethodCallAssignmentStatement({
			variable: 'previous',
			subject: 'this',
			method: `prepare${options.pascalName}Response`,
			args: [
				buildArg(buildVariable('post')),
				buildArg(buildVariable('request')),
			],
		})
	);

	statements.push(
		buildFunctionCallAssignmentStatement({
			variable: 'deleted',
			functionName: 'wp_delete_post',
			args: [
				buildArg(buildPropertyFetch('post', 'ID')),
				buildArg(buildScalarBool(true)),
			],
		})
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
