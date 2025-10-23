import { KernelError } from '@wpkernel/core/contracts';
import {
	createArg,
	createAssign,
	createExpressionStatement,
	createIdentifier,
	createMethodCall,
	createScalarString,
	createVariable,
	type PhpExpr,
	type PhpStmtExpression,
	createPrintable,
	type PhpPrintable,
} from '@wpkernel/php-json-ast';
import { PHP_INDENT } from '@wpkernel/php-json-ast';
import {
	buildScalarCast,
	normaliseVariableReference,
	type ScalarCastKind,
} from './utils';

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
	const indent = indentUnit.repeat(indentLevel);

	const methodCall = createMethodCall(
		createVariable(request.raw),
		createIdentifier('get_param'),
		[createArg(createScalarString(param))]
	);

	const expression: PhpExpr = cast
		? buildScalarCast(cast, methodCall)
		: methodCall;

	const assignment = createAssign(createVariable(target.raw), expression);
	const statement = createExpressionStatement(assignment);

	const castPrefix = cast ? getCastPrefix(cast) : '';
	const line = `${indent}${target.display} = ${castPrefix}${request.display}->get_param( '${param}' );`;

	return createPrintable(statement, [line]);
}

function getCastPrefix(cast: ScalarCastKind): string {
	switch (cast) {
		case 'int':
			return '(int) ';
		case 'float':
			return '(float) ';
		case 'string':
			return '(string) ';
		case 'bool':
			return '(bool) ';
		default:
			throw new KernelError('DeveloperError', {
				message:
					'Unsupported cast kind for request parameter assignment.',
				context: { cast },
			});
	}
}
