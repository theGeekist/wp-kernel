import type { RestRouteConfig } from './types';

/**
 * Subtask 2.1.a placeholder – the reduction plan calls for consolidating import derivation
 * inside the REST controller factories.  Keeping this helper stubbed out reminds maintainers
 * that `buildRestControllerClass` should eventually delegate import bookkeeping here rather
 * than collecting `additionalUses` in the CLI adapter.
 *
 * See {@link ../../docs/cli-ast-reduction-plan.md#subtask-2-1-a-–-streamline-import-derivation}
 * for the implementation notes that should replace this scaffold.
 */
export interface RestControllerImportDerivationOptions {
	readonly policyClass?: string;
}

/**
 * Computes the union of imports required for a controller and its routes.
 *
 * Current implementation is intentionally minimal; contributors should replace the empty set
 * with logic that evaluates each `RestRouteConfig` per the reduction plan guidance.
 * @param routes
 * @param options
 */
export function deriveRestControllerImports(
	routes: readonly RestRouteConfig[],
	options: RestControllerImportDerivationOptions = {}
): ReadonlySet<string> {
	void routes;
	void options;

	return new Set();
}
