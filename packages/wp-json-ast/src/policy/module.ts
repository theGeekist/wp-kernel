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
import { buildPolicyHelperMetadata } from '../common/metadata';
import { buildPolicyClass } from './class';
import type {
	PolicyDefinition,
	PolicyModuleConfig,
	PolicyModuleFile,
	PolicyModuleResult,
} from './types';

const DEFAULT_POLICY_FILE_NAME = 'Policy/Policy.php';

export function buildPolicyModule(
	config: PolicyModuleConfig
): PolicyModuleResult {
	const fileName = config.fileName ?? DEFAULT_POLICY_FILE_NAME;
	const docblock = buildPolicyDocblock(
		config.origin,
		config.policyMap.sourcePath
	);
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const classNode = buildPolicyClass({ policyMap: config.policyMap });
	const uses = buildUseStatements(['WP_Error', 'WP_REST_Request']);
	const namespace = buildNamespaceStatement({
		namespace: config.namespace,
		docblock,
		uses,
		classNode,
	});

	const program: PhpProgram = [strictTypes, namespace];

	emitPolicyWarnings(config);
	const metadata = buildPolicyHelperMetadata({
		sourcePath: config.policyMap.sourcePath,
		definitions: config.policyMap.definitions,
		fallback: config.policyMap.fallback,
		missing: config.policyMap.missing,
		unused: config.policyMap.unused,
		warnings: config.policyMap.warnings,
	});

	const file: PolicyModuleFile = {
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

function emitPolicyWarnings(config: PolicyModuleConfig): void {
	const hook = config.hooks?.onWarning;
	if (!hook) {
		return;
	}

	for (const warning of config.policyMap.warnings) {
		hook({ kind: 'policy-map-warning', warning });
	}

	for (const policy of config.policyMap.missing) {
		hook({
			kind: 'policy-definition-missing',
			policy,
			fallbackCapability: config.policyMap.fallback.capability,
			fallbackScope: config.policyMap.fallback.appliesTo,
		});
	}

	if (config.policyMap.unused.length === 0) {
		return;
	}

	const definitionMap = createDefinitionMap(config.policyMap.definitions);
	for (const policy of config.policyMap.unused) {
		const definition = definitionMap.get(policy);
		hook({
			kind: 'policy-definition-unused',
			policy,
			capability: definition?.capability,
			scope: definition?.appliesTo,
		});
	}
}

function createDefinitionMap(
	definitions: readonly PolicyDefinition[]
): ReadonlyMap<string, PolicyDefinition> {
	return new Map(
		definitions.map((definition) => [definition.key, definition])
	);
}

function buildPolicyDocblock(
	origin: string,
	sourcePath?: string
): readonly string[] {
	const source = sourcePath ?? '[fallback]';
	return [`Source: ${origin} → policy-map (${source})`];
}

interface BuildNamespaceStatementOptions {
	readonly namespace: string;
	readonly docblock: readonly string[];
	readonly uses: readonly PhpStmtUse[];
	readonly classNode: ReturnType<typeof buildPolicyClass>;
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
