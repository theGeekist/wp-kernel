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
	type PhpStmt,
	type PhpStmtClass,
	type PhpStmtUse,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import {
	buildGeneratedFileDocComment,
	buildRestBaseControllerDocblock,
	buildRestControllerDocblock,
	buildRestIndexDocblock,
} from '../common/docblock';
import type { ResourceControllerMetadata } from '../types';
import type {
	RestControllerIdentity,
	RestControllerIndexEntriesOptions,
	RestControllerModuleConfig,
	RestControllerModuleControllerConfig,
	RestControllerModuleFile,
	RestControllerModuleIndexEntry,
	RestControllerModuleMetadata,
	RestControllerModuleResult,
} from './types';
import { buildRestControllerClass } from './class';

export type {
	RestControllerModuleConfig,
	RestControllerModuleControllerConfig,
	RestControllerModuleFile,
	RestControllerModuleIndexEntry,
	RestControllerModuleResult,
} from './types';

const DEFAULT_BASE_CONTROLLER_CLASS = 'BaseController';
const DEFAULT_INDEX_METADATA: RestControllerModuleMetadata = {
	kind: 'index-file',
};

export function buildRestControllerModule(
	config: RestControllerModuleConfig
): RestControllerModuleResult {
	const strictTypes = buildStrictTypesDeclare();
	const includeBase = config.includeBaseController !== false;
	const baseControllerFileName =
		config.baseControllerFileName ??
		`Rest/${DEFAULT_BASE_CONTROLLER_CLASS}.php`;

	const files: RestControllerModuleFile[] = [];

	if (includeBase) {
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
			config,
			baseControllerFileName,
			includeBaseController: includeBase,
		})
	);

	return { files } satisfies RestControllerModuleResult;
}

interface BaseControllerFileOptions {
	readonly strictTypes: PhpStmt;
	readonly namespace: string;
	readonly sanitizedNamespace: string;
	readonly origin: string;
	readonly fileName: string;
}

function buildBaseControllerFile(
	options: BaseControllerFileOptions
): RestControllerModuleFile {
	const docblock = buildRestBaseControllerDocblock({
		origin: options.origin,
		sanitizedNamespace: options.sanitizedNamespace,
	});

	return compileModuleFile({
		strictTypes: options.strictTypes,
		fileName: options.fileName,
		namespace: options.namespace,
		docblock,
		metadata: { kind: 'base-controller' },
		statements: buildGuardedBlock([
			buildBaseControllerClass(options.sanitizedNamespace),
		]),
	});
}

interface ControllerFileOptions {
	readonly strictTypes: PhpStmt;
	readonly namespace: string;
	readonly origin: string;
	readonly controller: RestControllerModuleControllerConfig;
}

function buildControllerFile(
	options: ControllerFileOptions
): RestControllerModuleFile {
	const docblock = buildRestControllerDocblock({
		origin: options.origin,
		resourceName: options.controller.resourceName,
		schemaKey: options.controller.schemaKey,
		schemaProvenance: options.controller.schemaProvenance,
		routes: options.controller.routes.map((route) => route.metadata),
	});

	const { classNode, uses } = buildRestControllerClass(options.controller);
	const useStatements = buildUseStatements(uses);

	const metadata: ResourceControllerMetadata =
		options.controller.metadata ??
		buildControllerMetadata(options.controller);

	return compileModuleFile({
		strictTypes: options.strictTypes,
		fileName: options.controller.fileName,
		namespace: options.namespace,
		docblock,
		metadata,
		statements: [...useStatements, ...buildGuardedBlock([classNode])],
	});
}

interface IndexFileOptions {
	readonly strictTypes: PhpStmt;
	readonly config: RestControllerModuleConfig;
	readonly baseControllerFileName: string;
	readonly includeBaseController: boolean;
}

function buildIndexFile(options: IndexFileOptions): RestControllerModuleFile {
	const entries = buildIndexEntries({
		namespace: options.config.namespace,
		includeBase: options.includeBaseController,
		baseControllerFileName: options.baseControllerFileName,
		controllers: options.config.controllers,
		additionalEntries: options.config.additionalIndexEntries ?? [],
	});

	const docblock = buildRestIndexDocblock({
		origin: options.config.origin,
	});
	const returnNode = withGeneratedDocComment(
		buildReturn(buildIndexArray(entries)),
		docblock
	);

	return compileModuleFile({
		strictTypes: options.strictTypes,
		fileName: 'index.php',
		namespace: null,
		docblock,
		metadata: DEFAULT_INDEX_METADATA,
		statements: [returnNode],
	});
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

function buildGuardedBlock(statements: readonly PhpStmt[]): PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
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

type ParsedUse = {
	readonly type: number;
	readonly parts: readonly string[];
	readonly sortKey: string;
};

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

function buildIndexEntries(
	options: RestControllerIndexEntriesOptions
): RestControllerModuleIndexEntry[] {
	const baseEntries = options.includeBase
		? [
				{
					className: `${options.namespace}\\${DEFAULT_BASE_CONTROLLER_CLASS}`,
					path: options.baseControllerFileName,
				},
			]
		: [];

	const controllerEntries = options.controllers.map((controller) => ({
		className: `${options.namespace}\\${controller.className}`,
		path: controller.fileName,
	}));

	return [...baseEntries, ...controllerEntries, ...options.additionalEntries];
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

interface ModuleFileCompileOptions<
	TMetadata extends RestControllerModuleMetadata,
> {
	readonly strictTypes: PhpStmt;
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: TMetadata;
	readonly statements: readonly PhpStmt[];
}

function compileModuleFile<TMetadata extends RestControllerModuleMetadata>(
	options: ModuleFileCompileOptions<TMetadata>
): RestControllerModuleFile {
	const programStatements =
		options.namespace === null
			? options.statements
			: [
					buildNamespaceStatement(
						options.namespace,
						options.docblock,
						options.statements
					),
				];

	return {
		fileName: options.fileName,
		namespace: options.namespace,
		docblock: options.docblock,
		metadata: options.metadata,
		program: [options.strictTypes, ...programStatements],
	} satisfies RestControllerModuleFile;
}

function buildNamespaceStatement(
	namespace: string,
	docblock: readonly string[],
	body: readonly PhpStmt[]
): PhpStmt {
	const namespaceNode = buildNamespace(buildName(splitNamespace(namespace)), [
		...body,
	]);

	return mergeNodeAttributes(namespaceNode, {
		comments: [buildGeneratedFileDocComment(docblock)],
	});
}

function withGeneratedDocComment<TStatement extends PhpStmt>(
	statement: TStatement,
	docblock: readonly string[]
): TStatement {
	return mergeNodeAttributes(statement, {
		comments: [buildGeneratedFileDocComment(docblock)],
	});
}
