import { WPKernelError } from '@wpkernel/core/error';
import type {
	CapabilityCapabilityDescriptor,
	CapabilityMapDefinition,
	CapabilityMapEntry,
} from '../../capability-map';
import type {
	IRCapabilityHint,
	IRCapabilityMap,
	IRCapabilityScope,
	IRResource,
	IRWarning,
} from '../publicTypes';

interface ResolveCapabilityMapOptions {
	hints: IRCapabilityHint[];
	resources: IRResource[];
}

const FALLBACK_CAPABILITY = 'manage_options';

interface CapabilityResolutionContext {
	referencedKeys: Set<string>;
	fallback: IRCapabilityMap['fallback'];
}

/**
 * TODO: summary.
 * @param    options — TODO
 * @returns TODO
 * @category IR
 */
export async function resolveCapabilityMap(
	options: ResolveCapabilityMapOptions
): Promise<IRCapabilityMap> {
	const context = createResolutionContext(options);

	// Collect inline capability maps from resources
	const inlineMap = collectInlineCapabilities(options.resources);

	if (Object.keys(inlineMap).length === 0) {
		return createMissingMapResult(context);
	}

	const result = await buildResolvedCapabilityMap({
		map: inlineMap,
		referencedKeys: context.referencedKeys,
		hints: options.hints,
		resources: options.resources,
	});

	return {
		sourcePath: 'inline',
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

function collectInlineCapabilities(
	resources: IRResource[]
): CapabilityMapDefinition {
	const inlineMap: CapabilityMapDefinition = {};
	const seen = new Map<
		string,
		{ resource: string; value: CapabilityMapEntry }
	>();

	for (const resource of resources) {
		const capabilities = resource.capabilities;
		if (!capabilities || typeof capabilities !== 'object') {
			continue;
		}

		// Check for duplicate keys across resources
		for (const [key, val] of Object.entries(
			capabilities as Record<string, CapabilityMapEntry>
		)) {
			const prev = seen.get(key);
			if (prev && JSON.stringify(prev.value) !== JSON.stringify(val)) {
				throw new WPKernelError('ValidationError', {
					message: `Conflicting capability map entry '${key}' defined in multiple resources with different values.`,
					context: {
						capability: key,
						firstResource: prev.resource,
						secondResource: resource.name,
					},
				});
			}
			seen.set(key, { resource: resource.name, value: val });
			inlineMap[key] = val;
		}
	}

	return inlineMap;
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
	referencedKeys: Set<string>;
	hints: IRCapabilityHint[];
	resources: IRResource[];
}): Promise<Omit<IRCapabilityMap, 'fallback' | 'sourcePath'>> {
	const { map, referencedKeys, hints, resources } = options;
	const missing = new Set(referencedKeys);
	const warnings: IRCapabilityMap['warnings'] = [];
	const definitions: IRCapabilityMap['definitions'] = [];
	const unused = Object.keys(map)
		.filter((key) => !referencedKeys.has(key))
		.sort();

	for (const [key, entry] of Object.entries(map)) {
		const descriptor = normaliseEntry({
			key,
			entry,
			origin: 'inline',
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
		warnings.push(createMissingCapabilitiesWarning(missingList, hints));
	}

	if (unused.length > 0) {
		warnings.push({
			code: 'capability-map.entries.unused',
			message:
				'Capability definitions exist that are not referenced by any route.',
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

function createMissingCapabilitiesWarning(
	missingList: string[],
	hints: IRCapabilityHint[]
): IRWarning {
	// Build a map of missing capabilities to their referencing resources
	const missingWithResources = new Map<string, Set<string>>();
	for (const capability of missingList) {
		const hint = hints.find((h) => h.key === capability);
		if (hint) {
			const resourceNames = new Set(
				hint.references.map((ref) => ref.resource)
			);
			missingWithResources.set(capability, resourceNames);
		}
	}

	return {
		code: 'capability-map.entries.missing',
		message:
			'Capabilities referenced by routes are missing from resource capability definitions.',
		context: {
			capabilities: missingList,
			referencedBy: Object.fromEntries(
				Array.from(missingWithResources.entries()).map(
					([cap, resourceNames]) => [cap, Array.from(resourceNames)]
				)
			),
		},
	};
}

function sortKeys(keys: Iterable<string>): string[] {
	return Array.from(keys).sort();
}

function normaliseEntry(options: {
	key: string;
	entry: CapabilityMapEntry;
	origin: string;
}): CapabilityCapabilityDescriptor {
	return coerceDescriptor(options.entry, options);
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
