import type { PhpStmt } from '@wpkernel/php-json-ast';

import { buildRequestParamAssignmentStatement } from '../common/request';

import type { RestRouteIdentityPlan } from './types';

/**
 * Emits the statements required to extract and cast the resource identity for a REST route.
 *
 * When the route references the controller identity, the factory generates an assignment that
 * pulls the parameter from the `WP_REST_Request` instance and applies numeric casts for integer
 * identities.  Routes that do not use the identity omit any plumbing to avoid unnecessary
 * request work.
 *
 * @param plan
 */
/**
 * @param    plan
 * @category WordPress AST
 */
export function buildIdentityPlumbing(
	plan: RestRouteIdentityPlan
): readonly PhpStmt[] {
	if (!plan.route.usesIdentity) {
		return [];
	}

	const cast = plan.identity.type === 'number' ? 'int' : undefined;

	const assignment = buildRequestParamAssignmentStatement({
		requestVariable: 'request',
		param: plan.identity.param,
		targetVariable: plan.identity.param,
		cast,
	});

	return [assignment];
}
