import { WPKernelError } from '@wpkernel/core/error';
import {
	buildArg,
	buildAssign,
	buildIdentifier,
	buildMethodCall,
	buildScalarCast as buildScalarCastNode,
	buildScalarString,
	buildVariable,
	buildArrayCast,
	buildExpressionStatement,
	type PhpExpr,
	type PhpStmtExpression,
} from '@wpkernel/php-json-ast';

/**
 * A normalized variable reference.
 *
 * @category WordPress AST
 * @internal
 */
export interface NormalisedVariableReference {
	/** The raw variable name, without the leading `$`. */
	readonly raw: string;
	/** The variable name with the leading `$`. */
	readonly display: string;
}

/**
 * Normalizes a variable name to a consistent format.
 *
 * @param    name - The variable name to normalize.
 * @returns The normalized variable reference.
 * @category WordPress AST
 * @internal
 */
export function normaliseVariableReference(
	name: string
): NormalisedVariableReference {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new WPKernelError('DeveloperError', {
			message: 'Variable name must not be empty.',
			context: { name },
		});
	}

	if (trimmed.startsWith('$')) {
		const raw = trimmed.slice(1);
		if (!raw) {
			throw new WPKernelError('DeveloperError', {
				message: 'Variable name must include an identifier.',
				context: { name },
			});
		}

		return { raw, display: trimmed };
	}

	return { raw: trimmed, display: `$${trimmed}` };
}

/**
 * The kind of scalar cast to perform.
 *
 * @category WordPress AST
 */
export type ScalarCastKind = 'int' | 'float' | 'string' | 'bool' | 'array';

/**
 * Builds a PHP AST scalar cast expression.
 *
 * @param    kind - The kind of cast to perform.
 * @param    expr - The expression to cast.
 * @returns A PHP AST cast expression.
 * @category WordPress AST
 * @example
 * ```ts
 * import { buildScalarCast, buildScalarString } from '@wpkernel/wp-json-ast';
 *
 * const castExpr = buildScalarCast('int', buildScalarString('123'));
 * // (int) '123'
 * ```
 */
export function buildScalarCast(kind: ScalarCastKind, expr: PhpExpr): PhpExpr {
	if (kind === 'array') {
		return buildArrayCast(expr);
	}

	return buildScalarCastNode(kind, expr);
}

/**
 * Options for building a request parameter assignment statement.
 *
 * @category WordPress AST
 */
export interface RequestParamAssignmentOptions {
	/** The name of the variable holding the `WP_REST_Request` object. */
	readonly requestVariable: string;
	/** The name of the parameter to retrieve. */
	readonly param: string;
	/** The name of the variable to which the parameter value will be assigned. Defaults to the value of `param`. */
	readonly targetVariable?: string;
	/** An optional scalar cast to apply to the parameter value. */
	readonly cast?: ScalarCastKind;
}

/**
 * Builds a PHP AST statement that assigns a request parameter to a variable.
 *
 * @param    options - The options for building the statement.
 * @returns A PHP AST expression statement.
 * @category WordPress AST
 * @example
 * ```ts
 * import { buildRequestParamAssignmentStatement } from '@wpkernel/wp-json-ast';
 *
 * const statement = buildRequestParamAssignmentStatement({
 * 	requestVariable: '$request',
 * 	param: 'my_param',
 * 	targetVariable: '$myParam',
 * 	cast: 'int',
 * });
 *
 * // $myParam = (int) $request->get_param('my_param');
 * ```
 */
export function buildRequestParamAssignmentStatement(
	options: RequestParamAssignmentOptions
): PhpStmtExpression {
	const { requestVariable, param, targetVariable = param, cast } = options;

	const request = normaliseVariableReference(requestVariable);
	const target = normaliseVariableReference(targetVariable);
	const methodCall = buildMethodCall(
		buildVariable(request.raw),
		buildIdentifier('get_param'),
		[buildArg(buildScalarString(param))]
	);

	const expression: PhpExpr = cast
		? buildScalarCast(cast, methodCall)
		: methodCall;

	return buildExpressionStatement(
		buildAssign(buildVariable(target.raw), expression)
	);
}
