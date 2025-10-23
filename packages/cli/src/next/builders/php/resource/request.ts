import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildIdentifier,
	buildMethodCall,
	buildScalarString,
	buildVariable,
	type PhpExpr,
	type PhpStmtExpression,
	buildPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';
import {
	buildScalarCast,
	normaliseVariableReference,
	type ScalarCastKind,
} from './utils';
import { formatStatement } from './printer';

export interface RequestParamAssignmentOptions {
	readonly requestVariable: string;
	readonly param: string;
	readonly targetVariable?: string;
	readonly cast?: ScalarCastKind;
	readonly indentLevel?: number;
	readonly indentUnit?: string;
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
		indentUnit = PHP_INDENT,
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

	const assignment = buildAssign(buildVariable(target.raw), expression);
	const statement = buildExpressionStatement(assignment);

	const lines = formatStatement(statement, indentLevel, indentUnit);

	return buildPrintable(statement, lines);
}
