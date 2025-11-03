import { createHelper } from '../../../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../../../runtime/types';
import type { IRv1 } from '../../../../ir/publicTypes';
import { makeErrorCodeFactory, toPascalCase } from '../../utils';
import { resolveIdentityConfig } from '../../identity';
import {
	buildWpPostRouteBundle,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';

const WP_POST_ROUTE_HELPER_SYMBOL = Symbol(
	'@wpkernel/cli/resource/wpPost/routes'
);

export interface WpPostRouteHelperState {
	readonly bundles: Map<string, WpPostRouteBundle>;
}

interface WpPostRouteHelperHost {
	[WP_POST_ROUTE_HELPER_SYMBOL]?: WpPostRouteHelperState;
}

export function getWpPostRouteHelperState(
	context: PipelineContext
): WpPostRouteHelperState {
	const host = context as WpPostRouteHelperHost;
	if (!host[WP_POST_ROUTE_HELPER_SYMBOL]) {
		host[WP_POST_ROUTE_HELPER_SYMBOL] = {
			bundles: new Map(),
		} satisfies WpPostRouteHelperState;
	}

	return host[WP_POST_ROUTE_HELPER_SYMBOL]!;
}

export function readWpPostRouteBundle(
	state: WpPostRouteHelperState,
	resourceName: string
): WpPostRouteBundle | undefined {
	return state.bundles.get(resourceName);
}

export function createPhpWpPostRoutesHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.wpPostRoutes',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getWpPostRouteHelperState(options.context);
			state.bundles.clear();

			populateWpPostRouteBundles({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

interface PopulateWpPostRouteBundlesOptions {
	readonly ir: IRv1;
	readonly state: WpPostRouteHelperState;
}

function populateWpPostRouteBundles(
	options: PopulateWpPostRouteBundlesOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-post') {
			continue;
		}

		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);

		const bundle = buildWpPostRouteBundle({
			resource,
			pascalName,
			identity,
			errorCodeFactory,
		});

		options.state.bundles.set(resource.name, bundle);
	}
}
