import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KernelError } from '@wpkernel/core/error';
import type {
	PolicyCapabilityDescriptor,
	PolicyMapDefinition,
	PolicyMapEntry,
} from '../../../policy-map';
import {
	fileExists,
	formatError,
	getTsImport,
	resolveConfigValue,
} from '../../../config/load-kernel-config';
import type {
	IRPolicyHint,
	IRPolicyMap,
	IRResource,
	IRPolicyScope,
} from '../publicTypes';
import { toWorkspaceRelative } from '../../../utils';

interface ResolvePolicyMapOptions {
	workspaceRoot: string;
	hints: IRPolicyHint[];
	resources: IRResource[];
}

const POLICY_MAP_CANDIDATES = [
	'src/policy-map.ts',
	'src/policy-map.js',
	'src/policy-map.mjs',
	'src/policy-map.cjs',
];

const FALLBACK_CAPABILITY = 'manage_options';

interface PolicyResolutionContext {
	referencedKeys: Set<string>;
	fallback: IRPolicyMap['fallback'];
}

export async function resolvePolicyMap(
	options: ResolvePolicyMapOptions
): Promise<IRPolicyMap> {
	const context = createResolutionContext(options);
	const mapPath = await findPolicyMapPath(options.workspaceRoot);

	if (!mapPath) {
		return createMissingMapResult(context);
	}

	const map = await loadPolicyMapModule(mapPath);
	const result = await buildResolvedPolicyMap({
		map,
		mapPath,
		referencedKeys: context.referencedKeys,
		hints: options.hints,
		resources: options.resources,
	});

	return {
		sourcePath: toWorkspaceRelative(mapPath),
		fallback: context.fallback,
		...result,
	};
}

function createResolutionContext(
	options: ResolvePolicyMapOptions
): PolicyResolutionContext {
	const referencedKeys = new Set(options.hints.map((hint) => hint.key));

	return {
		referencedKeys,
		fallback: {
			capability: FALLBACK_CAPABILITY,
			appliesTo: 'resource',
		},
	};
}

function createMissingMapResult(context: PolicyResolutionContext): IRPolicyMap {
	const missing = sortKeys(context.referencedKeys);
	const warnings: IRPolicyMap['warnings'] = [];

	if (missing.length > 0) {
		warnings.push({
			code: 'policy-map.missing',
			message:
				'Policy map not found. Falling back to "manage_options" for referenced policies.',
			context: { policies: missing },
		});
	}

	return {
		sourcePath: undefined,
		definitions: [],
		fallback: context.fallback,
		missing,
		unused: [],
		warnings,
	};
}

async function buildResolvedPolicyMap(options: {
	map: PolicyMapDefinition;
	mapPath: string;
	referencedKeys: Set<string>;
	hints: IRPolicyHint[];
	resources: IRResource[];
}): Promise<Omit<IRPolicyMap, 'fallback' | 'sourcePath'>> {
	const { map, mapPath, referencedKeys, hints, resources } = options;
	const missing = new Set(referencedKeys);
	const warnings: IRPolicyMap['warnings'] = [];
	const definitions: IRPolicyMap['definitions'] = [];
	const unused = Object.keys(map)
		.filter((key) => !referencedKeys.has(key))
		.sort();

	for (const [key, entry] of Object.entries(map)) {
		const descriptor = await normaliseEntry({
			key,
			entry,
			origin: mapPath,
		});

		const appliesTo: IRPolicyScope = descriptor.appliesTo ?? 'resource';
		const binding =
			descriptor.binding ??
			deriveBinding({
				key,
				appliesTo,
				hints,
				resources,
			});

		if (appliesTo === 'object' && !binding) {
			warnings.push({
				code: 'policy-map.binding.missing',
				message: `Policy "${key}" targets an object but no request parameter could be inferred. The helper will default to "id".`,
				context: { policy: key },
			});
		}

		definitions.push({
			key,
			capability: descriptor.capability,
			appliesTo,
			binding: binding ?? undefined,
			source: 'map',
		});

		missing.delete(key);
	}

	const missingList = sortKeys(missing);

	if (missingList.length > 0) {
		warnings.push({
			code: 'policy-map.entries.missing',
			message:
				'Policies referenced by routes are missing from src/policy-map.',
			context: { policies: missingList },
		});
	}

	if (unused.length > 0) {
		warnings.push({
			code: 'policy-map.entries.unused',
			message:
				'Policy map defines policies that are not referenced by any route.',
			context: { policies: unused },
		});
	}

	definitions.sort((a, b) => a.key.localeCompare(b.key));

	return {
		definitions,
		missing: missingList,
		unused,
		warnings,
	};
}

async function findPolicyMapPath(
	workspaceRoot: string
): Promise<string | undefined> {
	for (const candidate of POLICY_MAP_CANDIDATES) {
		const absolute = path.resolve(workspaceRoot, candidate);
		if (await fileExists(absolute)) {
			return absolute;
		}
	}

	return undefined;
}

async function loadPolicyMapModule(
	mapPath: string
): Promise<PolicyMapDefinition> {
	const extension = path.extname(mapPath);
	let moduleExports: unknown;

	try {
		if (extension === '.ts') {
			const tsImport = await getTsImport();
			moduleExports = await tsImport(mapPath, {
				parentURL: pathToFileURL(mapPath).href,
			});
		} else {
			moduleExports = await import(pathToFileURL(mapPath).href);
		}
	} catch (error) {
		const message = `Failed to load policy map at ${mapPath}: ${formatError(error)}`;
		const underlying = error instanceof Error ? error : undefined;
		throw new KernelError('ValidationError', {
			message,
			context: { policyMapPath: mapPath },
			data: underlying ? { originalError: underlying } : undefined,
		});
	}

	const resolved = await resolveConfigValue(moduleExports);
	const map = extractPolicyMap(resolved);
	if (!map) {
		const message = `Policy map module at ${mapPath} must export a policy map object.`;
		throw new KernelError('ValidationError', {
			message,
			context: { policyMapPath: mapPath },
		});
	}

	return map;
}

function sortKeys(keys: Iterable<string>): string[] {
	return Array.from(keys).sort();
}

function extractPolicyMap(value: unknown): PolicyMapDefinition | null {
	if (isPolicyMapDefinition(value)) {
		return value;
	}

	if (
		isRecord(value) &&
		'policyMap' in value &&
		isPolicyMapDefinition((value as Record<string, unknown>).policyMap)
	) {
		return (value as { policyMap: PolicyMapDefinition }).policyMap;
	}

	return null;
}

async function normaliseEntry(options: {
	key: string;
	entry: PolicyMapEntry;
	origin: string;
}): Promise<PolicyCapabilityDescriptor> {
	const candidate = await evaluateEntry(options);
	return coerceDescriptor(candidate, options);
}

async function evaluateEntry(options: {
	key: string;
	entry: PolicyMapEntry;
	origin: string;
}): Promise<unknown> {
	if (typeof options.entry !== 'function') {
		return options.entry;
	}

	try {
		let result: unknown = options.entry();
		while (isPromise(result)) {
			result = await result;
		}

		return result;
	} catch (error) {
		const message = `Policy map entry "${options.key}" threw during evaluation.`;
		const underlying = error instanceof Error ? error : undefined;
		throw new KernelError('ValidationError', {
			message,
			context: {
				policy: options.key,
				policyMapPath: options.origin,
			},
			data: underlying ? { originalError: underlying } : undefined,
		});
	}
}

function coerceDescriptor(
	candidate: unknown,
	options: { key: string; origin: string }
): PolicyCapabilityDescriptor {
	if (typeof candidate === 'string') {
		return { capability: candidate, appliesTo: 'resource' };
	}

	if (isPolicyCapabilityDescriptor(candidate)) {
		assertValidPolicyScope(candidate.appliesTo, options);

		return {
			capability: candidate.capability,
			appliesTo: candidate.appliesTo ?? 'resource',
			binding: normaliseBinding(candidate.binding),
		};
	}

	const message = `Policy map entry "${options.key}" must resolve to a capability string or descriptor.`;
	throw new KernelError('ValidationError', {
		message,
		context: {
			policy: options.key,
			policyMapPath: options.origin,
			receivedType: typeof candidate,
		},
	});
}

function normaliseBinding(binding: unknown): string | undefined {
	if (typeof binding !== 'string') {
		return undefined;
	}

	const trimmed = binding.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function assertValidPolicyScope(
	scope: unknown,
	options: { key: string; origin: string }
): asserts scope is IRPolicyScope | undefined {
	if (scope === undefined || scope === 'resource' || scope === 'object') {
		return;
	}

	const message =
		`Policy map entry "${options.key}" has invalid appliesTo scope "${String(scope)}". ` +
		'Expected "resource" or "object".';

	throw new KernelError('ValidationError', {
		message,
		context: {
			policy: options.key,
			policyMapPath: options.origin,
			appliesTo: scope,
		},
	});
}

function deriveBinding(options: {
	key: string;
	appliesTo: IRPolicyScope;
	hints: IRPolicyHint[];
	resources: IRResource[];
}): string | null {
	if (options.appliesTo !== 'object') {
		return null;
	}

	const hint = options.hints.find(
		(candidate) => candidate.key === options.key
	);
	if (!hint) {
		return null;
	}

	const bindings = new Set<string>();
	for (const reference of hint.references) {
		const resource = options.resources.find(
			(candidate) => candidate.name === reference.resource
		);
		const param = resource?.identity?.param;
		if (param) {
			bindings.add(param);
		}
	}

	if (bindings.size === 1) {
		return bindings.values().next().value ?? null;
	}

	return null;
}

function isPolicyMapDefinition(value: unknown): value is PolicyMapDefinition {
	if (!isRecord(value)) {
		return false;
	}

	for (const entry of Object.values(value)) {
		if (!isPolicyMapEntry(entry)) {
			return false;
		}
	}

	return true;
}

function isPolicyMapEntry(value: unknown): value is PolicyMapEntry {
	return (
		typeof value === 'string' ||
		typeof value === 'function' ||
		isPolicyCapabilityDescriptor(value)
	);
}

function isPolicyCapabilityDescriptor(
	value: unknown
): value is PolicyCapabilityDescriptor {
	if (!isRecord(value)) {
		return false;
	}

	return typeof value.capability === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPromise(value: unknown): value is Promise<unknown> {
	return (
		isRecord(value) &&
		typeof (value as { then?: unknown }).then === 'function'
	);
}
