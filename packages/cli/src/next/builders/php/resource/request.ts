import {
	buildArg,
	buildIdentifier,
	buildMethodCall,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmtExpression,
} from '@wpkernel/php-json-ast';
import {
	buildScalarCast,
	normaliseVariableReference,
	buildVariableAssignment,
	type ScalarCastKind,
} from './utils';

export interface RequestParamAssignmentOptions {
	readonly requestVariable: string;
	readonly param: string;
	readonly targetVariable?: string;
	readonly cast?: ScalarCastKind;
}

export function createRequestParamAssignmentStatement(
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

	return buildVariableAssignment(target, expression);
}
