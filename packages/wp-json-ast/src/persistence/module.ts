import {
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
	buildStmtNop,
	mergeNodeAttributes,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpExpr,
	type PhpProgram,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import {
	buildGeneratedFileDocComment,
	buildPersistenceRegistryDocblock,
} from '../common/docblock';
import { buildPhpLiteral, sanitizeJsonValue, type JsonValue } from './helpers';
import type {
	PersistenceRegistryModuleConfig,
	PersistenceRegistryModuleFile,
	PersistenceRegistryModuleResult,
	PersistenceRegistryResourceConfig,
} from './types';

const DEFAULT_FILE_NAME = 'Registration/PersistenceRegistry.php';
const PERSISTENCE_METADATA = { kind: 'persistence-registry' } as const;

export function buildPersistenceRegistryModule(
	config: PersistenceRegistryModuleConfig
): PersistenceRegistryModuleResult {
	const fileName = config.fileName ?? DEFAULT_FILE_NAME;
	const docblock = buildPersistenceRegistryDocblock({
		origin: config.origin,
	});
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const classNode = buildPersistenceRegistryClass(config.resources);
	const namespace = buildNamespaceStatement({
		namespace: config.namespace,
		docblock,
		classNode,
	});

	const program: PhpProgram = [strictTypes, namespace];

	const file: PersistenceRegistryModuleFile = {
		fileName,
		namespace: config.namespace,
		docblock,
		metadata: PERSISTENCE_METADATA,
		program,
		uses: [],
		statements: [],
	};

	return { files: [file] };
}

function buildPersistenceRegistryClass(
	resources: readonly PersistenceRegistryResourceConfig[]
): ReturnType<typeof buildClass> {
	const method = buildClassMethod(buildIdentifier('get_config'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(buildRegistryPayload(resources))],
	});

	return buildClass(buildIdentifier('PersistenceRegistry'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: [method],
	});
}

function buildRegistryPayload(
	resources: readonly PersistenceRegistryResourceConfig[]
): PhpExpr {
	const entries = resources
		.filter((resource) => resource.storage || resource.identity)
		.map((resource) => ({
			key: resource.name,
			value: sanitizeJsonValue<JsonValue>({
				storage: resource.storage ?? null,
				identity: resource.identity ?? null,
			}),
		}));

	const resourcesPayload: Record<string, JsonValue> = {};
	for (const entry of entries) {
		resourcesPayload[entry.key] = entry.value;
	}

	const payload: JsonValue = {
		resources: resourcesPayload,
	};

	return buildPhpLiteral(payload);
}

interface BuildNamespaceStatementOptions {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly classNode: ReturnType<typeof buildPersistenceRegistryClass>;
}

function buildNamespaceStatement(
	options: BuildNamespaceStatementOptions
): PhpStmt {
	const namespaceNode = buildNamespace(
		buildName(splitNamespace(options.namespace)),
		[
			buildGuardedComment(AUTO_GUARD_BEGIN),
			options.classNode,
			buildGuardedComment(AUTO_GUARD_END),
		]
	);

	return mergeNodeAttributes(namespaceNode, {
		comments: [buildGeneratedFileDocComment(options.docblock)],
	});
}

function buildGuardedComment(marker: string): PhpStmt {
	return buildStmtNop({ comments: [buildComment(`// ${marker}`)] });
}

function splitNamespace(namespace: string): string[] {
	return namespace.length > 0 ? namespace.split('\\') : [];
}
