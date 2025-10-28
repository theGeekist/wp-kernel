import type { PhpStmt } from '@wpkernel/php-json-ast';

import type { RestRouteConfig } from './types';

/**
 * Subtask 2.1.c placeholder – route metadata and cache segment wiring need to move from the
 * CLI into `@wpkernel/wp-json-ast`.  This scaffold keeps the planned helper visible so future
 * contributors implement it where the roadmap expects.
 *
 * See {@link ../../docs/cli-ast-reduction-plan.md#subtask-2-1-c-–-surface-metadata-host-updates}
 * for the canonical behaviour this helper must eventually provide.
 */
export interface RestRouteMetadataPlan {
	readonly route: RestRouteConfig;
	readonly metadataHostVariable: string;
}

/**
 * Generates statements that synchronise metadata hosts with the provided route configuration.
 *
 * Until Subtask 2.1.c is scheduled, this placeholder returns an empty statement list.  Replace
 * the stub with cache-segment writes and docblock annotations when implementing the roadmap item.
 * @param plan
 */
export function buildRouteMetadataUpdates(
	plan: RestRouteMetadataPlan
): readonly PhpStmt[] {
	void plan;

	return [];
}
