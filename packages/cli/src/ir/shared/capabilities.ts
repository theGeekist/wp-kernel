import type { IRCapabilityHint, IRResource } from '../publicTypes';

export function collectCapabilityHints(
	resources: IRResource[]
): IRCapabilityHint[] {
	const hints = new Map<string, IRCapabilityHint>();

	for (const resource of resources) {
		for (const route of resource.routes) {
			if (!route.capability) {
				continue;
			}

			const existing = hints.get(route.capability);
			const reference = {
				resource: resource.name,
				route: route.path,
				transport: route.transport,
			} as const;

			if (existing) {
				existing.references.push(reference);
				continue;
			}

			hints.set(route.capability, {
				key: route.capability,
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
