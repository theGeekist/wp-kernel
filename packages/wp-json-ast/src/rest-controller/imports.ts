import type {
	PhpNode,
	PhpName,
	PhpNullableType,
	PhpParam,
	PhpStmt,
	PhpStmtClassMethod,
	PhpType,
} from '@wpkernel/php-json-ast';

import type { RestRouteConfig } from './types';

const BASE_IMPORTS = [
	'WP_Error',
	'WP_REST_Request',
	'function is_wp_error',
] as const;

const IGNORED_NAMES = new Set([
	'self',
	'static',
	'parent',
	'BaseController',
	'Policy',
]);

export interface RestControllerImportDerivationOptions {
	readonly policyClass?: string;
	readonly helperMethods?: readonly PhpStmtClassMethod[];
}

export function deriveRestControllerImports(
	routes: readonly RestRouteConfig[],
	options: RestControllerImportDerivationOptions = {}
): ReadonlySet<string> {
	const imports = new Set<string>(BASE_IMPORTS);

	if (
		options.policyClass &&
		routes.some((route) => route.policy !== undefined)
	) {
		imports.add(options.policyClass);
	}

	for (const route of routes) {
		collectImportsFromStatements(route.statements, imports);
	}

	if (options.helperMethods) {
		collectImportsFromStatements(options.helperMethods, imports);
	}

	return imports;
}

function collectImportsFromStatements(
	statements: readonly PhpStmt[],
	imports: Set<string>
): void {
	for (const statement of statements) {
		collectImportsFromNode(statement, imports, new Set());
	}
}

function collectImportsFromNode(
	node: PhpNode | undefined,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (!node || seen.has(node)) {
		return;
	}

	seen.add(node);
	handleNodeImports(node, imports, seen);
	visitChildNodes(node, imports, seen);
}

function handleNodeImports(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (handleClassMethodNode(node, imports, seen)) {
		return;
	}

	if (handleParamNode(node, imports, seen)) {
		return;
	}

	if (handleClassReferenceNode(node, imports)) {
		return;
	}

	if (handleNameNode(node, imports)) {
		return;
	}

	if (handleNullableTypeNode(node, imports, seen)) {
		return;
	}

	handleCompositeTypeNode(node, imports, seen);
}

function handleClassMethodNode(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): boolean {
	if (node.nodeType !== 'Stmt_ClassMethod') {
		return false;
	}

	collectImportsFromClassMethod(node as PhpStmtClassMethod, imports, seen);
	return true;
}

function handleParamNode(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): boolean {
	if (node.nodeType !== 'Param') {
		return false;
	}

	collectImportsFromParam(node as PhpParam, imports, seen);
	return true;
}

function handleClassReferenceNode(
	node: PhpNode,
	imports: Set<string>
): boolean {
	if (
		node.nodeType !== 'Expr_New' &&
		node.nodeType !== 'Expr_StaticCall' &&
		node.nodeType !== 'Expr_ClassConstFetch' &&
		node.nodeType !== 'Expr_Instanceof'
	) {
		return false;
	}

	const classTarget = (node as { class?: PhpNode }).class;
	collectNameLike(classTarget, imports);
	return true;
}

function handleNameNode(node: PhpNode, imports: Set<string>): boolean {
	if (node.nodeType !== 'Name' && node.nodeType !== 'Name_FullyQualified') {
		return false;
	}

	collectNameLike(node as PhpName, imports);
	return true;
}

function handleNullableTypeNode(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): boolean {
	if (node.nodeType !== 'NullableType') {
		return false;
	}

	collectImportsFromType((node as PhpNullableType).type, imports, seen);
	return true;
}

function handleCompositeTypeNode(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (node.nodeType !== 'UnionType' && node.nodeType !== 'IntersectionType') {
		return;
	}

	const composite = node as { types?: PhpType[] };
	const types = composite.types ?? [];
	for (const typeNode of types) {
		collectImportsFromType(typeNode, imports, seen);
	}
}

function visitChildNodes(
	node: PhpNode,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			visitArrayChildren(value, imports, seen);
			continue;
		}

		if (isPhpNode(value)) {
			collectImportsFromNode(value, imports, seen);
		}
	}
}

function visitArrayChildren(
	values: readonly unknown[],
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	for (const item of values) {
		if (isPhpNode(item)) {
			collectImportsFromNode(item, imports, seen);
		}
	}
}

function collectImportsFromClassMethod(
	node: PhpStmtClassMethod,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (Array.isArray(node.params)) {
		for (const param of node.params) {
			collectImportsFromParam(param as PhpParam, imports, seen);
		}
	}

	if (node.returnType) {
		collectImportsFromType(node.returnType, imports, seen);
	}
}

function collectImportsFromParam(
	node: PhpParam,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (node.type) {
		collectImportsFromType(node.type, imports, seen);
	}

	if (node.default && isPhpNode(node.default)) {
		collectImportsFromNode(node.default, imports, seen);
	}
}

function collectImportsFromType(
	node: PhpType,
	imports: Set<string>,
	seen: Set<PhpNode>
): void {
	if (!node) {
		return;
	}

	if (node.nodeType === 'Name' || node.nodeType === 'Name_FullyQualified') {
		collectNameLike(node as PhpName, imports);
		return;
	}

	if (node.nodeType === 'NullableType') {
		collectImportsFromType((node as PhpNullableType).type, imports, seen);
		return;
	}

	if (node.nodeType === 'UnionType' || node.nodeType === 'IntersectionType') {
		for (const typeNode of (node.types ?? []) as PhpType[]) {
			collectImportsFromType(typeNode, imports, seen);
		}
		return;
	}

	if (isPhpNode(node)) {
		collectImportsFromNode(node, imports, seen);
	}
}

function collectNameLike(
	node: PhpNode | undefined,
	imports: Set<string>
): void {
	if (
		!node ||
		(node.nodeType !== 'Name' && node.nodeType !== 'Name_FullyQualified')
	) {
		return;
	}

	const name = formatName(node as PhpName);
	if (!name) {
		return;
	}

	if (IGNORED_NAMES.has(name)) {
		return;
	}

	if (!requiresImport(name)) {
		return;
	}

	imports.add(name);
}

function formatName(node: PhpName): string | undefined {
	const parts = node.parts;
	if (!Array.isArray(parts) || parts.length === 0) {
		return undefined;
	}

	return parts.join('\\');
}

function requiresImport(name: string): boolean {
	const first = name[0];
	if (!first) {
		return false;
	}

	if (first.toLowerCase() === first && !name.startsWith('WP_')) {
		return false;
	}

	return true;
}

function isPhpNode(value: unknown): value is PhpNode {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}
