import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	CapabilityCapabilityDescriptor,
	CapabilityMapDefinition,
	CapabilityMapEntry,
} from '../../../capability-map';
import {
	fileExists,
	formatError,
	getTsImport,
	resolveConfigValue,
} from '../../../config/load-kernel-config';
import type {
	IRCapabilityHint,
	IRCapabilityMap,
	IRResource,
	IRCapabilityScope,
} from '../publicTypes';
import { toWorkspaceRelative } from '../../../utils';

interface ResolveCapabilityMapOptions {
	workspaceRoot: string;
	hints: IRCapabilityHint[];
	resources: IRResource[];
}

const POLICY_MAP_CANDIDATES = [
	'src/capability-map.ts',
	'src/capability-map.js',
	'src/capability-map.mjs',
	'src/capability-map.cjs',
];

const FALLBACK_CAPABILITY = 'manage_options';

interface CapabilityResolutionContext {
	referencedKeys: Set<string>;
	fallback: IRCapabilityMap['fallback'];
}

export async function resolveCapabilityMap(
	options: ResolveCapabilityMapOptions
): Promise<IRCapabilityMap> {
	const context = createResolutionContext(options);
	const mapPath = await findCapabilityMapPath(options.workspaceRoot);

	if (!mapPath) {
		return createMissingMapResult(context);
	}

	const map = await loadCapabilityMapModule(mapPath);
	const result = await buildResolvedCapabilityMap({
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
	options: ResolveCapabilityMapOptions
): CapabilityResolutionContext {
	const referencedKeys = new Set(options.hints.map((hint) => hint.key));

	return {
		referencedKeys,
		fallback: {
			capability: FALLBACK_CAPABILITY,
			appliesTo: 'resource',
		},
	};
}

function createMissingMapResult(
	context: CapabilityResolutionContext
): IRCapabilityMap {
	const missing = sortKeys(context.referencedKeys);
	const warnings: IRCapabilityMap['warnings'] = [];

	if (missing.length > 0) {
		warnings.push({
			code: 'capability-map.missing',
			message:
				'Capability map not found. Falling back to "manage_options" for referenced capabilities.',
			context: { capabilities: missing },
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

async function buildResolvedCapabilityMap(options: {
	map: CapabilityMapDefinition;
	mapPath: string;
	referencedKeys: Set<string>;
	hints: IRCapabilityHint[];
	resources: IRResource[];
}): Promise<Omit<IRCapabilityMap, 'fallback' | 'sourcePath'>> {
	const { map, mapPath, referencedKeys, hints, resources } = options;
	const missing = new Set(referencedKeys);
	const warnings: IRCapabilityMap['warnings'] = [];
	const definitions: IRCapabilityMap['definitions'] = [];
	const unused = Object.keys(map)
		.filter((key) => !referencedKeys.has(key))
		.sort();

	for (const [key, entry] of Object.entries(map)) {
		const descriptor = await normaliseEntry({
			key,
			entry,
			origin: mapPath,
		});

		const appliesTo: IRCapabilityScope = descriptor.appliesTo ?? 'resource';
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
				code: 'capability-map.binding.missing',
				message: `Capability "${key}" targets an object but no request parameter could be inferred. The helper will default to "id".`,
				context: { capability: key },
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
			code: 'capability-map.entries.missing',
			message:
				'Capabilities referenced by routes are missing from src/capability-map.',
			context: { capabilities: missingList },
		});
	}

	if (unused.length > 0) {
		warnings.push({
			code: 'capability-map.entries.unused',
			message:
				'Capability map defines capabilities that are not referenced by any route.',
			context: { capabilities: unused },
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

async function findCapabilityMapPath(
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

async function loadCapabilityMapModule(
	mapPath: string
): Promise<CapabilityMapDefinition> {
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
		const message = `Failed to load capability map at ${mapPath}: ${formatError(error)}`;
		const underlying = error instanceof Error ? error : undefined;
		throw new WPKernelError('ValidationError', {
			message,
			context: { capabilityMapPath: mapPath },
			data: underlying ? { originalError: underlying } : undefined,
		});
	}

	const resolved = await resolveConfigValue(moduleExports);
	const map = extractCapabilityMap(resolved);
	if (!map) {
		const message = `Capability map module at ${mapPath} must export a capability map object.`;
		throw new WPKernelError('ValidationError', {
			message,
			context: { capabilityMapPath: mapPath },
		});
	}

	return map;
}

function sortKeys(keys: Iterable<string>): string[] {
	return Array.from(keys).sort();
}

function extractCapabilityMap(value: unknown): CapabilityMapDefinition | null {
	if (isCapabilityMapDefinition(value)) {
		return value;
	}

	if (
		isRecord(value) &&
		'capabilityMap' in value &&
		isCapabilityMapDefinition(
			(value as Record<string, unknown>).capabilityMap
		)
	) {
		return (value as { capabilityMap: CapabilityMapDefinition })
			.capabilityMap;
	}

	return null;
}

async function normaliseEntry(options: {
	key: string;
	entry: CapabilityMapEntry;
	origin: string;
}): Promise<CapabilityCapabilityDescriptor> {
	const candidate = await evaluateEntry(options);
	return coerceDescriptor(candidate, options);
}

async function evaluateEntry(options: {
	key: string;
	entry: CapabilityMapEntry;
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
		const message = `Capability map entry "${options.key}" threw during evaluation.`;
		const underlying = error instanceof Error ? error : undefined;
		throw new WPKernelError('ValidationError', {
			message,
			context: {
				capability: options.key,
				capabilityMapPath: options.origin,
			},
			data: underlying ? { originalError: underlying } : undefined,
		});
	}
}

function coerceDescriptor(
	candidate: unknown,
	options: { key: string; origin: string }
): CapabilityCapabilityDescriptor {
	if (typeof candidate === 'string') {
		return { capability: candidate, appliesTo: 'resource' };
	}

	if (isCapabilityCapabilityDescriptor(candidate)) {
		assertValidCapabilityScope(candidate.appliesTo, options);

		return {
			capability: candidate.capability,
			appliesTo: candidate.appliesTo ?? 'resource',
			binding: normaliseBinding(candidate.binding),
		};
	}

	const message = `Capability map entry "${options.key}" must resolve to a capability string or descriptor.`;
	throw new WPKernelError('ValidationError', {
		message,
		context: {
			capability: options.key,
			capabilityMapPath: options.origin,
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

function assertValidCapabilityScope(
	scope: unknown,
	options: { key: string; origin: string }
): asserts scope is IRCapabilityScope | undefined {
	if (scope === undefined || scope === 'resource' || scope === 'object') {
		return;
	}

	const message =
		`Capability map entry "${options.key}" has invalid appliesTo scope "${String(scope)}". ` +
		'Expected "resource" or "object".';

	throw new WPKernelError('ValidationError', {
		message,
		context: {
			capability: options.key,
			capabilityMapPath: options.origin,
			appliesTo: scope,
		},
	});
}

function deriveBinding(options: {
	key: string;
	appliesTo: IRCapabilityScope;
	hints: IRCapabilityHint[];
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

function isCapabilityMapDefinition(
	value: unknown
): value is CapabilityMapDefinition {
	if (!isRecord(value)) {
		return false;
	}

	for (const entry of Object.values(value)) {
		if (!isCapabilityMapEntry(entry)) {
			return false;
		}
	}

	return true;
}

function isCapabilityMapEntry(value: unknown): value is CapabilityMapEntry {
	return (
		typeof value === 'string' ||
		typeof value === 'function' ||
		isCapabilityCapabilityDescriptor(value)
	);
}

function isCapabilityCapabilityDescriptor(
	value: unknown
): value is CapabilityCapabilityDescriptor {
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
