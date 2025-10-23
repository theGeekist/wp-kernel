import {
	buildArg,
	buildAssign,
	buildComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNode,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	buildNull,
	PHP_INDENT,
	type PhpExpr,
	type PhpExprNew,
	type PhpMethodBodyBuilder,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from '../../printer';
import {
	buildArrayDimFetch,
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
} from '../../utils';
import type { ResourceMutationContract } from '../../mutationContract';
export interface MacroExpression {
	readonly expression: PhpExpr;
	readonly display: string;
}

export function buildVariableExpression(name: string): MacroExpression {
	return {
		expression: buildVariable(name),
		display: `$${name}`,
	};
}

export function buildArrayDimExpression(
	array: string,
	key: string
): MacroExpression {
	return {
		expression: buildArrayDimFetch(array, buildScalarString(key)),
		display: `$${array}['${key}']`,
	};
}

export function buildPropertyExpression(
	object: string,
	property: string
): MacroExpression {
	return {
		expression: buildPropertyFetch(object, property),
		display: `$${object}->${property}`,
	};
}

interface MacroOptionsBase {
	readonly body: PhpMethodBodyBuilder;
	readonly indentLevel: number;
	readonly indentUnit?: string;
	readonly metadataKeys: ResourceMutationContract['metadataKeys'];
}

export interface StatusValidationMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly target: MacroExpression;
	readonly statusVariable?: MacroExpression;
	readonly requestVariable?: MacroExpression;
	readonly statusParam?: string;
	readonly guardWithNullCheck?: boolean;
}

export interface SyncMetaMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly requestVariable?: MacroExpression;
}

export interface SyncTaxonomiesMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly resultVariable: MacroExpression;
	readonly requestVariable?: MacroExpression;
}

export interface CachePrimingMacroOptions extends MacroOptionsBase {
	readonly pascalName: string;
	readonly postId: MacroExpression;
	readonly errorCode: string;
	readonly failureMessage: string;
	readonly requestVariable?: MacroExpression;
	readonly postVariableName?: string;
}

export function appendStatusValidationMacro(
	options: StatusValidationMacroOptions
): void {
	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'status-validation'
	);
	appendMetadataComment(
		options,
		options.metadataKeys.statusValidation,
		'normalise'
	);

	const statusVariable =
		options.statusVariable ?? buildVariableExpression('status');
	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const statusParam = options.statusParam ?? 'status';

	const statusAssign = buildExpressionStatement(
		buildAssign(
			statusVariable.expression,
			buildMethodCall(
				requestVariable.expression,
				buildIdentifier('get_param'),
				[buildArg(buildScalarString(statusParam))]
			)
		)
	);
	appendBodyStatement(options, statusAssign);

	const normalisedCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`normalise${options.pascalName}Status`),
		[buildArg(statusVariable.expression)]
	);
	const assignment = buildExpressionStatement(
		buildAssign(options.target.expression, normalisedCall)
	);

	if (options.guardWithNullCheck) {
		const guard = buildIfStatement(
			buildBinaryOperation(
				'NotIdentical',
				buildNull(),
				statusVariable.expression
			),
			[assignment]
		);
		appendBodyStatement(options, guard);
		return;
	}

	appendBodyStatement(options, assignment);
}

export function appendSyncMetaMacro(options: SyncMetaMacroOptions): void {
	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'sync-meta'
	);
	appendMetadataComment(options, options.metadataKeys.syncMeta, 'update');

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const call = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`sync${options.pascalName}Meta`),
		[
			buildArg(options.postId.expression),
			buildArg(requestVariable.expression),
		]
	);
	appendBodyStatement(options, buildExpressionStatement(call));
}

export function appendSyncTaxonomiesMacro(
	options: SyncTaxonomiesMacroOptions
): void {
	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'sync-taxonomies'
	);
	appendMetadataComment(
		options,
		options.metadataKeys.syncTaxonomies,
		'update'
	);

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const assign = buildExpressionStatement(
		buildAssign(
			options.resultVariable.expression,
			buildMethodCall(
				buildVariable('this'),
				buildIdentifier(`sync${options.pascalName}Taxonomies`),
				[
					buildArg(options.postId.expression),
					buildArg(requestVariable.expression),
				]
			)
		)
	);
	appendBodyStatement(options, assign);

	const guard = buildIfStatement(
		buildFuncCall(buildName(['is_wp_error']), [
			buildArg(options.resultVariable.expression),
		]),
		[buildReturn(options.resultVariable.expression)]
	);
	appendBodyStatement(options, guard);
}

export function appendCachePrimingMacro(
	options: CachePrimingMacroOptions
): void {
	appendMetadataComment(
		options,
		options.metadataKeys.channelTag,
		'cache-priming'
	);
	appendMetadataComment(options, options.metadataKeys.cachePriming, 'prime');
	appendMetadataComment(options, options.metadataKeys.cacheSegment, 'prime');

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const postVariableName = options.postVariableName ?? 'post';
	const postVariable = buildVariableExpression(postVariableName);

	appendBodyStatement(
		options,
		buildExpressionStatement(
			buildAssign(
				postVariable.expression,
				buildFuncCall(buildName(['get_post']), [
					buildArg(options.postId.expression),
				])
			)
		)
	);

	const failureExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarString(options.errorCode)),
			buildArg(buildScalarString(options.failureMessage)),
			buildArg(
				buildArrayLiteral([
					{
						key: 'status',
						value: buildScalarInt(500),
					},
				])
			),
		],
	});
	const failureGuard = buildIfStatement(
		buildBooleanNot(buildInstanceof(postVariableName, 'WP_Post')),
		[buildReturn(failureExpr)]
	);
	appendBodyStatement(options, failureGuard);

	const responseCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`prepare${options.pascalName}Response`),
		[
			buildArg(postVariable.expression),
			buildArg(requestVariable.expression),
		]
	);
	appendBodyStatement(options, buildReturn(responseCall));
}

function appendMetadataComment(
	options: MacroOptionsBase,
	key: string,
	value: string
): void {
	const text = `// @wp-kernel ${key} ${value}`;
	const statement = buildStmtNop({ comments: [buildComment(text)] });
	appendBodyStatement(options, statement);
}

function appendBodyStatement(
	options: MacroOptionsBase,
	statement: PhpStmt
): void {
	options.body.statement(
		formatStatementPrintable(statement, {
			indentLevel: options.indentLevel,
			indentUnit: options.indentUnit ?? PHP_INDENT,
		})
	);
}
