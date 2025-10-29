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
	RestControllerModuleConfig,
	RestControllerModuleControllerConfig,
	RestControllerModuleFile,
	RestControllerModuleIndexEntry,
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
const DEFAULT_INDEX_METADATA: RestControllerModuleFile['metadata'] = {
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

	const baseFiles = includeBase
		? [
				buildBaseControllerFile(
					strictTypes,
					config.namespace,
					config.sanitizedNamespace,
					config.origin,
					baseControllerFileName
				),
			]
		: [];

	const files: RestControllerModuleFile[] = [
		...baseFiles,
		...config.controllers.map((controller) =>
			buildControllerFile(
				strictTypes,
				config.namespace,
				config.origin,
				controller
			)
		),
		buildIndexFile(
			strictTypes,
			config,
			baseControllerFileName,
			includeBase
		),
	];

	return { files } satisfies RestControllerModuleResult;
}

function buildBaseControllerFile(
	strictTypes: PhpStmt,
	namespaceName: string,
	sanitizedNamespace: string,
	origin: string,
	fileName: string
): RestControllerModuleFile {
	const docblock = buildRestBaseControllerDocblock({
		origin,
		sanitizedNamespace,
	});
	const namespace = buildNamespaceStatement(
		namespaceName,
		docblock,
		buildGuardedBlock([buildBaseControllerClass(sanitizedNamespace)])
	);

	return {
		fileName,
		namespace: namespaceName,
		docblock,
		metadata: { kind: 'base-controller' },
		program: [strictTypes, namespace],
	};
}

function buildControllerFile(
	strictTypes: PhpStmt,
	namespace: string,
	origin: string,
	controller: RestControllerModuleControllerConfig
): RestControllerModuleFile {
	const docblock = buildRestControllerDocblock({
		origin,
		resourceName: controller.resourceName,
		schemaKey: controller.schemaKey,
		schemaProvenance: controller.schemaProvenance,
		routes: controller.routes.map((route) => route.metadata),
	});

	const { classNode, uses } = buildRestControllerClass(controller);
	const useStatements = buildUseStatements(uses);

	const namespaceNode = buildNamespaceStatement(namespace, docblock, [
		...useStatements,
		...buildGuardedBlock([classNode]),
	]);

	const metadata: ResourceControllerMetadata =
		controller.metadata ?? buildControllerMetadata(controller);

	return {
		fileName: controller.fileName,
		namespace,
		docblock,
		metadata,
		program: [strictTypes, namespaceNode],
	};
}

function buildIndexFile(
	strictTypes: PhpStmt,
	config: RestControllerModuleConfig,
	baseControllerFileName: string,
	includeBaseController: boolean
): RestControllerModuleFile {
	const entries = buildIndexEntries({
		namespace: config.namespace,
		includeBase: includeBaseController,
		baseControllerFileName,
		controllers: config.controllers,
		additionalEntries: config.additionalIndexEntries ?? [],
	});

	const docblock = buildRestIndexDocblock({ origin: config.origin });
	const returnNode = mergeNodeAttributes(
		buildReturn(buildIndexArray(entries)),
		{ comments: [buildGeneratedFileDocComment(docblock)] }
	);

	return {
		fileName: 'index.php',
		namespace: null,
		docblock,
		metadata: DEFAULT_INDEX_METADATA,
		program: [strictTypes, returnNode],
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

function buildIndexEntries(options: {
	readonly namespace: string;
	readonly includeBase: boolean;
	readonly baseControllerFileName: string;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalEntries: readonly RestControllerModuleIndexEntry[];
}): RestControllerModuleIndexEntry[] {
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
