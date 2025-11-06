import {
	buildArg,
	buildBinaryOperation,
	buildContinue,
	buildScalarString,
	type PhpExpr,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildFunctionCall } from '../../resource/common/utils';

/**
 * @param    name
 * @category WordPress AST
 */
export function buildConstFetchExpr(name: string) {
	return buildFunctionCall('constant', [buildArg(buildScalarString(name))]);
}

/**
 * @category WordPress AST
 */
export function buildContinueStatement(): PhpStmt {
	return buildContinue();
}

const CONCAT_OPERATOR = 'Concat' as unknown as Parameters<
	typeof buildBinaryOperation
>[0];

/**
 * @param    left
 * @param    right
 * @category WordPress AST
 */
export function buildConcat(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildBinaryOperation(CONCAT_OPERATOR, left, right);
}
