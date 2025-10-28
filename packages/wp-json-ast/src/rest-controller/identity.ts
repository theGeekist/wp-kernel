import type { PhpStmt } from '@wpkernel/php-json-ast';

import type { RestControllerIdentity, RestRouteConfig } from './types';

/**
 * Subtask 2.1.b placeholder – eventually the REST route factory should internalise identity
 * plumbing so the CLI no longer assembles `$identity = $request->get_param()` statements.
 *
 * Implementation guidance lives in
 * {@link ../../docs/cli-ast-reduction-plan.md#subtask-2-1-b-–-internalise-identity-plumbing}.
 * Keep new behaviour aligned with that section to avoid drifting requirements.
 */
export interface RestRouteIdentityPlan {
	readonly identity: RestControllerIdentity;
	readonly route: RestRouteConfig;
}

/**
 * Emits the statements required to extract and cast the resource identity for a REST route.
 *
 * The placeholder currently returns an empty array to minimise behavioural changes until the
 * full implementation lands.  Replace with the appropriate request parameter assignments and
 * casts when Subtask 2.1.b is executed.
 * @param plan
 */
export function buildIdentityPlumbing(
	plan: RestRouteIdentityPlan
): readonly PhpStmt[] {
	void plan;

	return [];
}
