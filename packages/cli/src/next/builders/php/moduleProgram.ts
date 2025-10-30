import {
	AUTO_GUARD_BEGIN,
	AUTO_GUARD_END,
	buildGeneratedFileDocComment,
	type BaseControllerMetadata,
	type IndexFileMetadata,
} from '@wpkernel/wp-json-ast';
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

type ModuleProgramMetadata = BaseControllerMetadata | IndexFileMetadata;

export interface ModuleProgramDefinition {
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: ModuleProgramMetadata;
	readonly statements: readonly PhpStmt[];
}

export function compileModuleProgram(
	program: ModuleProgramDefinition
): PhpProgram {
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);
	const guardedStatements = buildGuardedBlock(program.statements);
	const compiledStatements =
		program.namespace === null
			? applyDocblockToStatements(guardedStatements, program.docblock)
			: [
					buildNamespaceStatement({
						namespace: program.namespace,
						docblock: program.docblock,
						statements: guardedStatements,
					}),
				];

	return [strictTypes, ...compiledStatements];
}

function buildGuardedBlock(statements: readonly PhpStmt[]): PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];
}

function buildNamespaceStatement(options: {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly statements: readonly PhpStmt[];
}): PhpStmt {
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
