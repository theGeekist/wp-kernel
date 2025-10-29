import {
	buildComment,
	buildStmtNop,
	mergeNodeAttributes,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import { buildGeneratedFileDocComment } from '../common/docblock';

export function buildGuardedBlock(
	statements: readonly PhpStmt[]
): readonly PhpStmt[] {
	const guarded: PhpStmt[] = [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];

	return guarded;
}

export function withGeneratedDocComment<TStatement extends PhpStmt>(
	statement: TStatement,
	docblock: readonly string[]
): TStatement {
	if (docblock.length === 0) {
		return statement;
	}

	return mergeNodeAttributes(statement, {
		comments: [buildGeneratedFileDocComment(docblock)],
	});
}
