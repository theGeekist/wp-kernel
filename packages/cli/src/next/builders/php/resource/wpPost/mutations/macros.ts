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
	type PhpExpr,
	type PhpExprNew,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import {
	buildArrayDimFetch,
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildInstanceof,
	buildPropertyFetch,
} from '../../utils';
import type { ResourceMutationContract } from '../../mutationContract';
import { buildReturnIfWpError } from '../../errors';
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

export function buildStatusValidationStatements(
	options: StatusValidationMacroOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [
		buildMetadataComment(
			options.metadataKeys.channelTag,
			'status-validation'
		),
		buildMetadataComment(
			options.metadataKeys.statusValidation,
			'normalise'
		),
	];

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
	statements.push(statusAssign);

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
		statements.push(guard);
		return statements;
	}

	statements.push(assignment);
	return statements;
}

export function buildSyncMetaStatements(
	options: SyncMetaMacroOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [
		buildMetadataComment(options.metadataKeys.channelTag, 'sync-meta'),
		buildMetadataComment(options.metadataKeys.syncMeta, 'update'),
	];

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
	statements.push(buildExpressionStatement(call));
	return statements;
}

export function buildSyncTaxonomiesStatements(
	options: SyncTaxonomiesMacroOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [
		buildMetadataComment(
			options.metadataKeys.channelTag,
			'sync-taxonomies'
		),
		buildMetadataComment(options.metadataKeys.syncTaxonomies, 'update'),
	];

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
	statements.push(assign);

	statements.push(buildReturnIfWpError(options.resultVariable.expression));
	return statements;
}

export function buildCachePrimingStatements(
	options: CachePrimingMacroOptions
): PhpStmt[] {
	const statements: PhpStmt[] = [
		buildMetadataComment(options.metadataKeys.channelTag, 'cache-priming'),
		buildMetadataComment(options.metadataKeys.cachePriming, 'prime'),
		buildMetadataComment(options.metadataKeys.cacheSegment, 'prime'),
	];

	const requestVariable =
		options.requestVariable ?? buildVariableExpression('request');
	const postVariableName = options.postVariableName ?? 'post';
	const postVariable = buildVariableExpression(postVariableName);

	statements.push(
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
	statements.push(failureGuard);

	const responseCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`prepare${options.pascalName}Response`),
		[
			buildArg(postVariable.expression),
			buildArg(requestVariable.expression),
		]
	);
	statements.push(buildReturn(responseCall));
	return statements;
}

function buildMetadataComment(key: string, value: string): PhpStmt {
	const text = `// @wp-kernel ${key} ${value}`;
	return buildStmtNop({ comments: [buildComment(text)] });
}
