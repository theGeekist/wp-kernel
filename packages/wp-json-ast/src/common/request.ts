import { WPKernelError } from '@wpkernel/core';
import {
	buildArg,
	buildAssign,
	buildIdentifier,
	buildMethodCall,
	buildScalarCast,
	buildScalarString,
	buildVariable,
	buildArrayCast,
	buildExpressionStatement,
	type PhpExpr,
	type PhpStmtExpression,
} from '@wpkernel/php-json-ast';

export interface NormalisedVariableReference {
	readonly raw: string;
	readonly display: string;
}

function normaliseVariableReference(name: string): NormalisedVariableReference {
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

export type ScalarCastKind = 'int' | 'float' | 'string' | 'bool' | 'array';

function buildScalarCastExpression(
	kind: ScalarCastKind,
	expr: PhpExpr
): PhpExpr {
	if (kind === 'array') {
		return buildArrayCast(expr);
	}

	return buildScalarCast(kind, expr);
}

export interface RequestParamAssignmentOptions {
	readonly requestVariable: string;
	readonly param: string;
	readonly targetVariable?: string;
	readonly cast?: ScalarCastKind;
}

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
		? buildScalarCastExpression(cast, methodCall)
		: methodCall;

	return buildExpressionStatement(
		buildAssign(buildVariable(target.raw), expression)
	);
}
