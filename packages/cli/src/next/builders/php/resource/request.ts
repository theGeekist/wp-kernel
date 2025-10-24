import {
	buildArg,
	buildIdentifier,
	buildMethodCall,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmtExpression,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import {
	buildScalarCast,
	normaliseVariableReference,
	buildVariableAssignment,
	printStatement,
	type ScalarCastKind,
} from './utils';

export interface RequestParamAssignmentOptions {
	readonly requestVariable: string;
	readonly param: string;
	readonly targetVariable?: string;
	readonly cast?: ScalarCastKind;
	readonly indentLevel?: number;
}

export function createRequestParamAssignment(
	options: RequestParamAssignmentOptions
): PhpPrintable<PhpStmtExpression> {
	const {
		requestVariable,
		param,
		targetVariable = param,
		cast,
		indentLevel = 0,
	} = options;

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

	const statement = buildVariableAssignment(target, expression);

	return printStatement(statement, indentLevel);
}
