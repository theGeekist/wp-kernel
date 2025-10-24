import {
	PHP_INDENT,
	type PhpPrintable,
	type PhpStmt,
	type PhpStmtExpression,
	type PhpStmtIf,
} from '@wpkernel/php-json-ast';
import { formatStatementPrintable } from './printer';
import {
	buildIfStatementNode,
	type IfStatementOptions,
	buildArrayInitialiserStatement,
	type ArrayInitialiserStatementOptions,
} from './utils';
import {
	createQueryArgsAssignmentStatement,
	type QueryArgsAssignmentOptions,
	createPaginationNormalisationStatements,
	type PaginationNormalisationOptions,
	createWpQueryExecutionStatement,
	type ExecuteWpQueryOptions,
} from './query';
import {
	createRequestParamAssignmentStatement,
	type RequestParamAssignmentOptions,
} from './request';

export interface PrintStatementOptions {
	readonly indentLevel: number;
	readonly indentUnit?: string;
}

export function printStatement<T extends PhpStmt>(
	statement: T,
	options: PrintStatementOptions
): PhpPrintable<T> {
	const { indentLevel, indentUnit = PHP_INDENT } = options;
	return formatStatementPrintable(statement, { indentLevel, indentUnit });
}

export interface IfPrintableOptions
	extends Omit<IfStatementOptions, 'statements'> {
	readonly indentLevel: number;
	readonly indentUnit?: string;
	readonly statements: readonly PhpPrintable<PhpStmt>[];
}

export function buildIfPrintable(
	options: IfPrintableOptions
): PhpPrintable<PhpStmtIf> {
	const statementOptions: IfStatementOptions = {
		condition: options.condition,
		statements: options.statements.map((stmt) => stmt.node),
	};
	const node = buildIfStatementNode(statementOptions);
	return formatStatementPrintable(node, {
		indentLevel: options.indentLevel,
		indentUnit: options.indentUnit ?? PHP_INDENT,
	});
}

export interface ArrayInitialiserOptions
	extends ArrayInitialiserStatementOptions {
	readonly indentLevel: number;
	readonly indentUnit?: string;
}

export function buildArrayInitialiser(
	options: ArrayInitialiserOptions
): PhpPrintable<PhpStmtExpression> {
	const statement = buildArrayInitialiserStatement({
		variable: options.variable,
	});
	return formatStatementPrintable(statement, {
		indentLevel: options.indentLevel,
		indentUnit: options.indentUnit ?? PHP_INDENT,
	});
}

export interface PrintableQueryArgsAssignmentOptions
	extends QueryArgsAssignmentOptions {
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createQueryArgsAssignment(
	options: PrintableQueryArgsAssignmentOptions
): PhpPrintable<PhpStmtExpression> {
	const { indentLevel = 0, indentUnit = PHP_INDENT, ...rest } = options;
	const statement = createQueryArgsAssignmentStatement(rest);
	return formatStatementPrintable(statement, {
		indentLevel,
		indentUnit,
	});
}

export interface PrintablePaginationNormalisationOptions
	extends PaginationNormalisationOptions {
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createPaginationNormalisation(
	options: PrintablePaginationNormalisationOptions
): readonly [
	PhpPrintable<PhpStmtExpression>,
	PhpPrintable<PhpStmtIf>,
	PhpPrintable<PhpStmtIf>,
] {
	const { indentLevel = 0, indentUnit = PHP_INDENT, ...rest } = options;
	const [assignment, ensurePositive, clampMaximum] =
		createPaginationNormalisationStatements(rest);

	return [
		formatStatementPrintable(assignment, { indentLevel, indentUnit }),
		formatStatementPrintable(ensurePositive, { indentLevel, indentUnit }),
		formatStatementPrintable(clampMaximum, { indentLevel, indentUnit }),
	] as const;
}

export interface PrintableWpQueryExecutionOptions
	extends ExecuteWpQueryOptions {
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createWpQueryExecution(
	options: PrintableWpQueryExecutionOptions
): PhpPrintable<PhpStmtExpression> {
	const { indentLevel = 0, indentUnit = PHP_INDENT, ...rest } = options;
	const statement = createWpQueryExecutionStatement(rest);
	return formatStatementPrintable(statement, { indentLevel, indentUnit });
}

export interface PrintableRequestParamAssignmentOptions
	extends RequestParamAssignmentOptions {
	readonly indentLevel?: number;
	readonly indentUnit?: string;
}

export function createRequestParamAssignment(
	options: PrintableRequestParamAssignmentOptions
): PhpPrintable<PhpStmtExpression> {
	const { indentLevel = 0, indentUnit = PHP_INDENT, ...rest } = options;
	const statement = createRequestParamAssignmentStatement(rest);
	return formatStatementPrintable(statement, { indentLevel, indentUnit });
}
