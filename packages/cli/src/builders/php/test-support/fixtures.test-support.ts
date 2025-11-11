import type {
	IRBlock,
	IRCapabilityDefinition,
	IRHashProvenance,
	IRResource,
	IRRoute,
	IRv1,
} from '../../../ir/publicTypes';
import type { ResourceIdentityConfig } from '@wpkernel/core/resource';
import { createBlockHash, createBlockId } from '../../../ir/shared/identity';

/**
 * Builds a deterministic IR hash provenance for tests.
 * @param label
 */
export function makeHash(label: string): IRHashProvenance {
	return {
		algo: 'sha256',
		inputs: [label],
		value: label,
	};
}

/**
 * Creates an IR route with reasonable defaults.
 * @param overrides
 */
export function makeRoute(overrides: Partial<IRRoute> = {}): IRRoute {
	const method = overrides.method ?? 'GET';
	const path = overrides.path ?? '/demo';
	return {
		method,
		path,
		transport: overrides.transport ?? 'local',
		capability: overrides.capability,
		hash: overrides.hash ?? makeHash(`${method}:${path}`),
	};
}

/**
 * Creates an IR resource with stable defaults for tests.
 *
 * @param overrides - Partial resource overrides to merge into the defaults.
 */
export function makeResource(overrides: Partial<IRResource> = {}): IRResource {
	const name = overrides.name ?? 'resource';

	return {
		id: overrides.id ?? `res:${name}`,
		name,
		schemaKey: overrides.schemaKey ?? `${name}.schema`,
		schemaProvenance: overrides.schemaProvenance ?? 'manual',
		routes: overrides.routes ?? [makeRoute()],
		cacheKeys: resolveCacheKeys(name, overrides.cacheKeys),
		identity: resolveIdentity(overrides.identity),
		storage: overrides.storage,
		queryParams: overrides.queryParams,
		ui: overrides.ui,
		capabilities: overrides.capabilities,
		hash: overrides.hash ?? makeHash(`resource:${name}`),
		warnings: overrides.warnings ?? [],
	};
}

function resolveIdentity(
	identity?: ResourceIdentityConfig
): ResourceIdentityConfig {
	return identity ?? { type: 'number', param: 'id' };
}

function resolveCacheKeys(
	name: string,
	cacheKeys?: IRResource['cacheKeys']
): IRResource['cacheKeys'] {
	const fallback = (suffix: string): IRResource['cacheKeys']['list'] => ({
		segments: [name, suffix],
		source: 'default',
	});

	if (!cacheKeys) {
		return {
			list: fallback('list'),
			get: fallback('get'),
			create: fallback('create'),
			update: fallback('update'),
			remove: fallback('remove'),
		};
	}

	return {
		list: cacheKeys.list ?? fallback('list'),
		get: cacheKeys.get ?? fallback('get'),
		create: cacheKeys.create ?? fallback('create'),
		update: cacheKeys.update ?? fallback('update'),
		remove: cacheKeys.remove ?? fallback('remove'),
	};
}

/**
 * Creates an IR capability definition with defaults.
 * @param overrides
 */
export function makeCapabilityDefinition(
	overrides: Partial<IRCapabilityDefinition> = {}
): IRCapabilityDefinition {
	const key = overrides.key ?? 'resource.read';
	return {
		id: overrides.id ?? `cap:${key}`,
		key,
		capability: overrides.capability ?? key.replace('.', '_'),
		appliesTo: overrides.appliesTo ?? 'resource',
		binding: overrides.binding,
		source: overrides.source ?? 'map',
	};
}

export interface BlockFixture
	extends Partial<Pick<IRBlock, 'hash' | 'id' | 'hasRender'>>,
		Pick<IRBlock, 'key' | 'directory' | 'manifestSource'> {}

export function makeBlock(fixture: BlockFixture): IRBlock {
	const { key, directory, manifestSource } = fixture;
	const hasRender = fixture.hasRender ?? true;

	return {
		id: fixture.id ?? createBlockId({ key, directory, manifestSource }),
		key,
		directory,
		hasRender,
		manifestSource,
		hash:
			fixture.hash ??
			createBlockHash({
				key,
				directory,
				hasRender,
				manifestSource,
			}),
	};
}

/**
 * Convenience helper for updating an IRV1 with block fixtures.
 * @param ir
 * @param fixtures
 */
export function withBlocks(ir: IRv1, fixtures: readonly BlockFixture[]): IRv1 {
	return {
		...ir,
		blocks: fixtures.map(makeBlock),
	};
}
