import {
	buildComment,
	buildDeclare,
	buildDeclareItem,
	buildName,
	buildNamespace,
	buildScalarInt,
	buildStmtNop,
	mergeNodeAttributes,
	type PhpProgram,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import { buildGeneratedFileDocComment } from '../common/docblock';
import type { ModuleProgramFile } from './types';

export function buildGeneratedModuleProgram<TMetadata>(
	program: ModuleProgramFile<TMetadata>
): PhpProgram {
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const guardedStatements = buildGuardedBlock(program.statements);

	if (program.namespace === null) {
		return [
			strictTypes,
			...applyDocblockToStatements(guardedStatements, program.docblock),
		];
	}

	return [
		strictTypes,
		buildNamespaceStatement({
			namespace: program.namespace,
			docblock: program.docblock,
			statements: guardedStatements,
		}),
	];
}

function buildGuardedBlock(statements: readonly PhpStmt[]): PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];
}

interface BuildNamespaceStatementOptions {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly statements: readonly PhpStmt[];
}

function buildNamespaceStatement(
	options: BuildNamespaceStatementOptions
): PhpStmt {
	const namespaceNode = buildNamespace(
		buildName(splitNamespace(options.namespace)),
		[...options.statements]
	);

	return mergeNodeAttributes(namespaceNode, {
		comments: [buildGeneratedFileDocComment(options.docblock)],
	}) as PhpStmt;
}

function applyDocblockToStatements(
	statements: readonly PhpStmt[],
	docblock: readonly string[]
): PhpStmt[] {
	if (statements.length === 0) {
		return [];
	}

	const [first, ...rest] = statements as [PhpStmt, ...PhpStmt[]];
	const firstWithDocblock = mergeNodeAttributes(first, {
		comments: [buildGeneratedFileDocComment(docblock)],
	}) as PhpStmt;

	return [firstWithDocblock, ...rest];
}

function splitNamespace(namespace: string): string[] {
	return namespace.length > 0 ? namespace.split('\\') : [];
}
