import { createHelper } from '../../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../../runtime/types';
import type {
	RestControllerRouteHandlers,
	RestControllerRouteOptionHandlers,
	TransientStorageArtifacts,
} from '@wpkernel/wp-json-ast';
import {
	buildTransientStorageArtifacts,
	buildWpOptionStorageArtifacts,
	buildWpTaxonomyHelperArtifacts,
	buildWpTaxonomyQueryRouteBundle,
	resolveTransientKey,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../../ir/publicTypes';
import { resolveIdentityConfig } from '../identity';
import { makeErrorCodeFactory, toPascalCase } from '../utils';
import { ensureWpOptionStorage } from './wpOption/shared';
import { ensureWpTaxonomyStorage } from './wpTaxonomy';

export interface WpOptionStorageHelperArtifacts {
	readonly helperMethods: ReturnType<
		typeof buildWpOptionStorageArtifacts
	>['helperMethods'];
	readonly routeHandlers: RestControllerRouteOptionHandlers;
}

export interface WpTaxonomyStorageHelperArtifacts {
	readonly helperMethods: ReturnType<
		typeof buildWpTaxonomyHelperArtifacts
	>['helperMethods'];
	readonly helperSignatures: ReturnType<
		typeof buildWpTaxonomyHelperArtifacts
	>['helperSignatures'];
	readonly routeHandlers: RestControllerRouteHandlers;
}

export interface ResourceStorageHelperState {
	readonly transient: Map<string, TransientStorageArtifacts>;
	readonly wpOption: Map<string, WpOptionStorageHelperArtifacts>;
	readonly wpTaxonomy: Map<string, WpTaxonomyStorageHelperArtifacts>;
}

const RESOURCE_STORAGE_HELPERS_SYMBOL = Symbol(
	'@wpkernel/cli/resource/storageHelpers'
);

interface ResourceStorageHelperHost {
	[RESOURCE_STORAGE_HELPERS_SYMBOL]?: ResourceStorageHelperState;
}

export function getResourceStorageHelperState(
	context: PipelineContext
): ResourceStorageHelperState {
	const host = context as ResourceStorageHelperHost;
	if (!host[RESOURCE_STORAGE_HELPERS_SYMBOL]) {
		host[RESOURCE_STORAGE_HELPERS_SYMBOL] = {
			transient: new Map(),
			wpOption: new Map(),
			wpTaxonomy: new Map(),
		} satisfies ResourceStorageHelperState;
	}

	return host[RESOURCE_STORAGE_HELPERS_SYMBOL]!;
}

export function createPhpTransientStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.transient',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.transient.clear();

			populateTransientArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

export function createPhpWpOptionStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.wpOption',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.wpOption.clear();

			populateWpOptionArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

export function createPhpWpTaxonomyStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.wpTaxonomy',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.wpTaxonomy.clear();

			populateWpTaxonomyArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

interface PopulateArtifactsBaseOptions {
	readonly ir: IRv1;
	readonly state: ResourceStorageHelperState;
}

function populateTransientArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'transient') {
			continue;
		}

		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);
		const key = resolveTransientKey({
			resourceName: resource.name,
			namespace:
				options.ir.meta.sanitizedNamespace ??
				options.ir.meta.namespace ??
				'',
		});

		const artifacts = buildTransientStorageArtifacts({
			pascalName,
			key,
			identity,
			cacheSegments: resource.cacheKeys.get.segments,
			errorCodeFactory,
		});

		options.state.transient.set(resource.name, artifacts);
	}
}

function populateWpOptionArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-option') {
			continue;
		}

		const storage = ensureWpOptionStorage(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);
		const artifacts = buildWpOptionStorageArtifacts({
			pascalName,
			optionName: storage.option,
			errorCodeFactory,
		});

		options.state.wpOption.set(resource.name, {
			helperMethods: artifacts.helperMethods,
			routeHandlers: artifacts.routeHandlers,
		});
	}
}

function populateWpTaxonomyArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-taxonomy') {
			continue;
		}

		const storage = ensureWpTaxonomyStorage(resource.storage, {
			resourceName: resource.name,
		});
		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);

		const helperArtifacts = buildWpTaxonomyHelperArtifacts({
			pascalName,
			storage,
			identity,
			errorCodeFactory,
		});
		const queryBundle = buildWpTaxonomyQueryRouteBundle({
			pascalName,
			storage,
			identity,
			errorCodeFactory,
			resourceName: resource.name,
		});

		options.state.wpTaxonomy.set(resource.name, {
			helperMethods: helperArtifacts.helperMethods,
			helperSignatures: helperArtifacts.helperSignatures,
			routeHandlers: queryBundle.routeHandlers,
		});
	}
}
