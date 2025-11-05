import {
	buildComment,
	buildDeclare,
	buildDeclareItem,
	buildName,
	buildNamespace,
	buildScalarInt,
	buildStmtNop,
	buildUse,
	buildUseUse,
	mergeNodeAttributes,
	type PhpProgram,
	type PhpStmt,
	type PhpStmtUse,
} from '@wpkernel/php-json-ast';

import { AUTO_GUARD_BEGIN, AUTO_GUARD_END } from '../constants';
import { buildGeneratedFileDocComment } from '../common/docblock';
import { buildCapabilityHelperMetadata } from '../common/metadata';
import { buildCapabilityClass } from './class';
import type {
	CapabilityDefinition,
	CapabilityModuleConfig,
	CapabilityModuleFile,
	CapabilityModuleResult,
} from './types';

const DEFAULT_CAPABILITY_FILE_NAME = 'Capability/Capability.php';

export function buildCapabilityModule(
	config: CapabilityModuleConfig
): CapabilityModuleResult {
	const fileName = config.fileName ?? DEFAULT_CAPABILITY_FILE_NAME;
	const docblock = buildCapabilityDocblock(
		config.origin,
		config.capabilityMap.sourcePath
	);
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const classNode = buildCapabilityClass({
		capabilityMap: config.capabilityMap,
	});
	const uses = buildUseStatements(['WP_Error', 'WP_REST_Request']);
	const namespace = buildNamespaceStatement({
		namespace: config.namespace,
		docblock,
		uses,
		classNode,
	});

	const program: PhpProgram = [strictTypes, namespace];

	emitCapabilityWarnings(config);
	const metadata = buildCapabilityHelperMetadata({
		sourcePath: config.capabilityMap.sourcePath,
		definitions: config.capabilityMap.definitions,
		fallback: config.capabilityMap.fallback,
		missing: config.capabilityMap.missing,
		unused: config.capabilityMap.unused,
		warnings: config.capabilityMap.warnings,
	});

	const file: CapabilityModuleFile = {
		fileName,
		namespace: config.namespace,
		docblock,
		metadata,
		program,
		uses: ['WP_Error', 'WP_REST_Request'],
		statements: [],
	};

	return { files: [file] };
}

function emitCapabilityWarnings(config: CapabilityModuleConfig): void {
	const hook = config.hooks?.onWarning;
	if (!hook) {
		return;
	}

	for (const warning of config.capabilityMap.warnings) {
		hook({ kind: 'capability-map-warning', warning });
	}

	for (const capability of config.capabilityMap.missing) {
		hook({
			kind: 'capability-definition-missing',
			capability,
			fallbackCapability: config.capabilityMap.fallback.capability,
			fallbackScope: config.capabilityMap.fallback.appliesTo,
		});
	}

	if (config.capabilityMap.unused.length === 0) {
		return;
	}

	const definitionMap = createDefinitionMap(config.capabilityMap.definitions);
	for (const capability of config.capabilityMap.unused) {
		const definition = definitionMap.get(capability);
		hook({
			kind: 'capability-definition-unused',
			capability: definition?.capability ?? capability,
			scope: definition?.appliesTo,
		});
	}
}

function createDefinitionMap(
	definitions: readonly CapabilityDefinition[]
): ReadonlyMap<string, CapabilityDefinition> {
	return new Map(
		definitions.map((definition) => [definition.key, definition])
	);
}

function buildCapabilityDocblock(
	origin: string,
	sourcePath?: string
): readonly string[] {
	const source = sourcePath ?? '[fallback]';
	return [`Source: ${origin} → capability-map (${source})`];
}

interface BuildNamespaceStatementOptions {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly uses: readonly PhpStmtUse[];
	readonly classNode: ReturnType<typeof buildCapabilityClass>;
}

function buildNamespaceStatement(
	options: BuildNamespaceStatementOptions
): PhpStmt {
	const namespaceNode = buildNamespace(
		buildName(splitNamespace(options.namespace)),
		[...options.uses, ...buildGuardedBlock([options.classNode])]
	);

	return mergeNodeAttributes(namespaceNode, {
		comments: [buildGeneratedFileDocComment(options.docblock)],
	});
}

function buildGuardedBlock(statements: readonly PhpStmt[]): readonly PhpStmt[] {
	return [
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] }),
		...statements,
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] }),
	];
}

function buildUseStatements(entries: readonly string[]): PhpStmtUse[] {
	return entries
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.sort((left, right) => left.localeCompare(right))
		.map((entry) => {
			const parts = entry
				.split('\\')
				.filter((segment) => segment.length > 0);
			return buildUse(0, [buildUseUse(buildName(parts))]);
		});
}

function splitNamespace(namespace: string): string[] {
	return namespace.length > 0 ? namespace.split('\\') : [];
}
