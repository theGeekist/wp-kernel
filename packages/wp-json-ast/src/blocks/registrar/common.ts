import {
	buildArg,
	buildBinaryOperation,
	buildContinue,
	buildScalarString,
	type PhpExpr,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildFunctionCall } from '../../resource/common/utils';

export function buildConstFetchExpr(name: string) {
	return buildFunctionCall('constant', [buildArg(buildScalarString(name))]);
}

export function buildContinueStatement(): PhpStmt {
	return buildContinue();
}

const CONCAT_OPERATOR = 'Concat' as unknown as Parameters<
	typeof buildBinaryOperation
>[0];

export function buildConcat(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildBinaryOperation(CONCAT_OPERATOR, left, right);
}
