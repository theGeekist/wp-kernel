import type {
	IRBlock,
	IRCapabilityDefinition,
	IRHashProvenance,
	IRResource,
	IRRoute,
	IRv1,
} from '../../types.js';
import type { ResourceIdentityConfig } from '@wpkernel/core/resource';
import {
	createBlockHash,
	createBlockId,
} from '@wpkernel/cli/ir/shared/identity';
import { buildControllerClassName } from '../../ir/meta.test-support.js';

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

type ResourceFixtureOverrides = Partial<IRResource> & {
	namespace?: string;
};

const pick = <T>(value: T | undefined, fallback: () => T): T =>
	value === undefined ? fallback() : value;

/**
 * Creates an IR resource with stable defaults for tests.
 * @param overrides
 */
export function makeResource(
	overrides: ResourceFixtureOverrides = {}
): IRResource {
	const { namespace = 'demo-namespace', ...rest } = overrides;
	const name = pick(rest.name, () => 'resource');
	const controllerClass = pick(rest.controllerClass, () =>
		buildControllerClassName(namespace, name)
	);
	const schemaKey = pick(rest.schemaKey, () => `${name}.schema`);
	const schemaProvenance = pick(
		rest.schemaProvenance,
		() => 'manual' as IRResource['schemaProvenance']
	);
	const routes = pick(rest.routes, () => [makeRoute()]);
	const cacheKeys = resolveCacheKeys(name, rest.cacheKeys);
	const identity = resolveIdentity(rest.identity);
	const hash = pick(rest.hash, () => makeHash(`resource:${name}`));
	const warnings = pick(rest.warnings, () => []);

	return {
		id: pick(rest.id, () => `res:${name}`),
		name,
		controllerClass,
		schemaKey,
		schemaProvenance,
		routes,
		cacheKeys,
		identity,
		storage: rest.storage,
		queryParams: rest.queryParams,
		ui: rest.ui,
		blocks: rest.blocks,
		capabilities: rest.capabilities,
		hash,
		warnings,
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
 * Convenience helper for updating an IR with block fixtures.
 * @param ir
 * @param fixtures
 */
export function withBlocks(ir: IRv1, fixtures: readonly BlockFixture[]): IRv1 {
	return {
		...ir,
		blocks: fixtures.map(makeBlock),
	};
}
