import { getNamespace } from '../namespace';
import type { ResourceConfig } from './types';

export interface ResolvedResourceNamespace {
	readonly namespace: string;
	readonly resourceName: string;
}

export function parseNamespaceFromString(
	name: string
): ResolvedResourceNamespace | null {
	if (!name.includes(':')) {
		return null;
	}

	const parts = name.split(':', 2);
	const namespace = parts[0];
	const resourceName = parts[1];

	if (namespace && resourceName) {
		return { namespace, resourceName };
	}

	return null;
}

export function resolveNamespaceAndName<T, TQuery>(
	config: ResourceConfig<T, TQuery>
): ResolvedResourceNamespace {
	if (config.namespace) {
		const parsed = parseNamespaceFromString(config.name);
		if (parsed) {
			return {
				namespace: config.namespace,
				resourceName: parsed.resourceName,
			};
		}

		return { namespace: config.namespace, resourceName: config.name };
	}

	const parsed = parseNamespaceFromString(config.name);
	if (parsed) {
		return parsed;
	}

	const namespace = getNamespace();
	return { namespace, resourceName: config.name };
}
