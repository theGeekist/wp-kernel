import {
	buildArray,
	buildArrayItem,
	buildBinaryOperation,
	buildClass,
	buildClassMethod,
	buildComment,
	buildDeclare,
	buildDeclareItem,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	buildUse,
	buildUseUse,
	mergeNodeAttributes,
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpExpr,
	type PhpProgram,
	type PhpStmt,
	type PhpStmtClass,
	type PhpStmtUse,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import { buildGeneratedFileDocComment } from '../docblocks';
import type {
	BaseControllerMetadata,
	ResourceControllerMetadata,
} from '../types';
import type {
	RestControllerClassConfig,
	RestControllerIdentity,
	RestRouteConfig,
} from './types';
import { buildRestControllerClass } from './class';

export interface RestControllerModuleControllerConfig
	extends RestControllerClassConfig {
	readonly resourceName: string;
	readonly schemaProvenance: string;
	readonly fileName: string;
	readonly metadata?: ResourceControllerMetadata;
}

export interface RestControllerModuleIndexEntry {
	readonly className: string;
	readonly path: string;
}

export interface RestControllerModuleFile {
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata:
		| BaseControllerMetadata
		| ResourceControllerMetadata
		| { readonly kind: 'index-file' };
	readonly program: PhpProgram;
}

export interface RestControllerModuleResult {
	readonly files: readonly RestControllerModuleFile[];
}

export interface RestControllerModuleConfig {
	readonly origin: string;
	readonly sanitizedNamespace: string;
	readonly namespace: string;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalIndexEntries?: readonly RestControllerModuleIndexEntry[];
	readonly baseControllerFileName?: string;
	readonly includeBaseController?: boolean;
}

const DEFAULT_BASE_CONTROLLER_CLASS = 'BaseController';
const DEFAULT_INDEX_METADATA = { kind: 'index-file' } as const;

export function buildRestControllerModule(
	config: RestControllerModuleConfig
): RestControllerModuleResult {
	const files: RestControllerModuleFile[] = [];
	const strictTypes = buildStrictTypesDeclare();

	const baseControllerFileName =
		config.baseControllerFileName ??
		`Rest/${DEFAULT_BASE_CONTROLLER_CLASS}.php`;

	if (config.includeBaseController !== false) {
		files.push(
			buildBaseControllerFile({
				strictTypes,
				namespace: config.namespace,
				sanitizedNamespace: config.sanitizedNamespace,
				origin: config.origin,
				fileName: baseControllerFileName,
			})
		);
	}

	for (const controller of config.controllers) {
		files.push(
			buildControllerFile({
				strictTypes,
				namespace: config.namespace,
				origin: config.origin,
				controller,
			})
		);
	}

	files.push(
		buildIndexFile({
			strictTypes,
			origin: config.origin,
			namespace: config.namespace,
			baseControllerFileName,
			includeBaseController: config.includeBaseController !== false,
			controllers: config.controllers,
			additionalEntries: config.additionalIndexEntries ?? [],
		})
	);

	return { files };
}

interface BuildBaseControllerFileOptions {
	readonly strictTypes: PhpStmt;
	readonly namespace: string;
	readonly sanitizedNamespace: string;
	readonly origin: string;
	readonly fileName: string;
}

function buildBaseControllerFile(
	options: BuildBaseControllerFileOptions
): RestControllerModuleFile {
	const docblock = [
		`Source: ${options.origin} → resources (namespace: ${options.sanitizedNamespace})`,
	];
	const namespace = buildNamespaceStatement({
		namespace: options.namespace,
		docblock,
		body: buildGuardedBlock([
			buildBaseControllerClass(options.sanitizedNamespace),
		]),
	});

	const program: PhpProgram = [options.strictTypes, namespace];

	const metadata: BaseControllerMetadata = { kind: 'base-controller' };

	return {
		fileName: options.fileName,
		namespace: options.namespace,
		docblock,
		metadata,
		program,
	};
}

interface BuildControllerFileOptions {
	readonly strictTypes: PhpStmt;
	readonly namespace: string;
	readonly origin: string;
	readonly controller: RestControllerModuleControllerConfig;
}

function buildControllerFile(
	options: BuildControllerFileOptions
): RestControllerModuleFile {
	const { controller } = options;
	const docblock = buildControllerDocblock({
		origin: options.origin,
		resourceName: controller.resourceName,
		schemaKey: controller.schemaKey,
		schemaProvenance: controller.schemaProvenance,
		routes: controller.routes,
	});

	const { classNode, uses } = buildRestControllerClass(controller);
	const useStatements = buildUseStatements(uses);

	const namespace = buildNamespaceStatement({
		namespace: options.namespace,
		docblock,
		body: [...useStatements, ...buildGuardedBlock([classNode])],
	});

	const program: PhpProgram = [options.strictTypes, namespace];

	const metadata: ResourceControllerMetadata =
		controller.metadata ?? buildControllerMetadata(controller);

	return {
		fileName: controller.fileName,
		namespace: options.namespace,
		docblock,
		metadata,
		program,
	};
}

interface BuildIndexFileOptions {
	readonly strictTypes: PhpStmt;
	readonly origin: string;
	readonly namespace: string;
	readonly baseControllerFileName: string;
	readonly includeBaseController: boolean;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalEntries: readonly RestControllerModuleIndexEntry[];
}

function buildIndexFile(
	options: BuildIndexFileOptions
): RestControllerModuleFile {
	const entries: RestControllerModuleIndexEntry[] = [];

	if (options.includeBaseController) {
		entries.push({
			className: `${options.namespace}\\${DEFAULT_BASE_CONTROLLER_CLASS}`,
			path: options.baseControllerFileName,
		});
	}

	for (const controller of options.controllers) {
		entries.push({
			className: `${options.namespace}\\${controller.className}`,
			path: controller.fileName,
		});
	}

	for (const entry of options.additionalEntries) {
		entries.push(entry);
	}

	const docblock = [`Source: ${options.origin} → php/index`];
	const returnNode = mergeNodeAttributes(
		buildReturn(buildIndexArray(entries)),
		{ comments: [buildGeneratedFileDocComment(docblock)] }
	);

	const program: PhpProgram = [options.strictTypes, returnNode];

	return {
		fileName: 'index.php',
		namespace: null,
		docblock,
		metadata: DEFAULT_INDEX_METADATA,
		program,
	};
}

function buildStrictTypesDeclare(): PhpStmt {
	return buildDeclare([buildDeclareItem('strict_types', buildScalarInt(1))]);
}

function buildBaseControllerClass(sanitizedNamespace: string): PhpStmtClass {
	const getNamespaceMethod = buildClassMethod(
		buildIdentifier('get_namespace'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(sanitizedNamespace))],
		}
	);

	return buildClass(buildIdentifier(DEFAULT_BASE_CONTROLLER_CLASS), {
		flags: PHP_CLASS_MODIFIER_ABSTRACT,
		stmts: [getNamespaceMethod],
	});
}

interface BuildNamespaceStatementOptions {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly body: readonly PhpStmt[];
}

function buildNamespaceStatement(
	options: BuildNamespaceStatementOptions
): PhpStmt {
	const namespaceNode = buildNamespace(
		buildName(splitNamespace(options.namespace)),
		[...options.body]
	);

	return mergeNodeAttributes(namespaceNode, {
		comments: [buildGeneratedFileDocComment(options.docblock)],
	});
}

function buildGuardedBlock(statements: readonly PhpStmt[]): PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];
}

interface BuildControllerDocblockOptions {
	readonly origin: string;
	readonly resourceName: string;
	readonly schemaKey: string;
	readonly schemaProvenance: string;
	readonly routes: readonly RestRouteConfig[];
}

function buildControllerDocblock(
	options: BuildControllerDocblockOptions
): readonly string[] {
	return [
		`Source: ${options.origin} → resources.${options.resourceName}`,
		`Schema: ${options.schemaKey} (${options.schemaProvenance})`,
		...options.routes.map(
			(route) =>
				`Route: [${route.metadata.method}] ${route.metadata.path}`
		),
	];
}

function buildControllerMetadata(
	controller: RestControllerModuleControllerConfig
): ResourceControllerMetadata {
	return {
		kind: 'resource-controller',
		name: controller.resourceName,
		identity: normaliseIdentity(controller.identity),
		routes: controller.routes.map((route) => route.metadata),
	};
}

function normaliseIdentity(
	identity: RestControllerIdentity
): ResourceControllerMetadata['identity'] {
	return {
		type: identity.type,
		param: identity.param,
	};
}

interface ParsedUse {
	readonly type: number;
	readonly parts: readonly string[];
	readonly sortKey: string;
}

function buildUseStatements(uses: readonly string[]): PhpStmtUse[] {
	const parsed = new Map<string, ParsedUse>();

	for (const useEntry of uses) {
		const parsedUse = parseUseEntry(useEntry);
		parsed.set(parsedUse.sortKey, parsedUse);
	}

	return [...parsed.values()]
		.sort((left, right) => left.sortKey.localeCompare(right.sortKey))
		.map((entry) =>
			buildUse(entry.type, [buildUseUse(buildName([...entry.parts]))])
		);
}

function parseUseEntry(entry: string): ParsedUse {
	const trimmed = entry.trim();
	if (trimmed.length === 0) {
		throw new TypeError('Use entry must not be empty.');
	}

	if (trimmed.startsWith('function ')) {
		const name = trimmed.slice('function '.length);
		return buildParsedUse(name, 1);
	}

	if (trimmed.startsWith('const ')) {
		const name = trimmed.slice('const '.length);
		return buildParsedUse(name, 2);
	}

	return buildParsedUse(trimmed, 0);
}

function buildParsedUse(name: string, type: number): ParsedUse {
	const normalised = name.replace(/^\\+/u, '');
	const parts = splitNamespace(normalised);
	const sortKey = `${type}:${parts.join('\\')}`;
	return { type, parts, sortKey } satisfies ParsedUse;
}

function splitNamespace(namespace: string): string[] {
	return namespace
		.split('\\')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function buildIndexArray(
	entries: readonly RestControllerModuleIndexEntry[]
): PhpExpr {
	const items = entries.map((entry) =>
		buildArrayItem(buildIndexPathExpression(entry.path), {
			key: buildScalarString(entry.className),
		})
	);

	return buildArray(items);
}

function buildIndexPathExpression(path: string): PhpExpr {
	const normalised = path.startsWith('/') ? path : `/${path}`;
	return buildBinaryOperation(
		'Concat',
		buildDirectoryConstFetch(),
		buildScalarString(normalised)
	);
}

function buildDirectoryConstFetch(): PhpExpr {
	return {
		nodeType: 'Expr_ConstFetch',
		attributes: {},
		name: buildName(['__DIR__']),
	};
}
