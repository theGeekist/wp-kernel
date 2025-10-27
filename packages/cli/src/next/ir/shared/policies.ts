import type { IRPolicyHint, IRResource } from '../publicTypes';

export function collectPolicyHints(resources: IRResource[]): IRPolicyHint[] {
	const hints = new Map<string, IRPolicyHint>();

	for (const resource of resources) {
		for (const route of resource.routes) {
			if (!route.policy) {
				continue;
			}

			const existing = hints.get(route.policy);
			const reference = {
				resource: resource.name,
				route: route.path,
				transport: route.transport,
			} as const;

			if (existing) {
				existing.references.push(reference);
				continue;
			}

			hints.set(route.policy, {
				key: route.policy,
				source: 'resource',
				references: [reference],
			});
		}
	}

	const sorted = Array.from(hints.values()).sort((a, b) =>
		a.key.localeCompare(b.key)
	);
	for (const hint of sorted) {
		hint.references.sort((a, b) => {
			const resourceComparison = a.resource.localeCompare(b.resource);
			if (resourceComparison !== 0) {
				return resourceComparison;
			}

			return a.route.localeCompare(b.route);
		});
	}

	return sorted;
}
