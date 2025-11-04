import {
	createWPKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
	getStringValue,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRoutes(resource) {
	const routesProperty = getObjectProperty(resource, 'routes');
	if (!routesProperty || routesProperty.value.kind !== 'object') {
		return [];
	}

	const routes = [];
	for (const [key, property] of routesProperty.value.properties.entries()) {
		const value = property.value;
		if (value?.kind === 'object') {
			const method = getMethod(value);
			routes.push({
				key,
				property,
				value,
				meta: {
					method,
					normalizedMethod: method?.toUpperCase() ?? null,
					hasCapability: hasCapability(value),
				},
			});
			continue;
		}

		routes.push({
			key,
			property,
			value,
			meta: null,
		});
	}

	return routes;
}

function getMethod(route) {
	if (!route || route.kind !== 'object') {
		return null;
	}

	return getStringValue(getObjectProperty(route, 'method')?.value);
}

function hasCapability(route) {
	if (!route || route.kind !== 'object') {
		return false;
	}

	const capability = getObjectProperty(route, 'capability');
	if (!capability) {
		return false;
	}

	const capabilityValue = getStringValue(capability.value);
	return typeof capabilityValue === 'string' && capabilityValue.length > 0;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Warns when write routes lack capability identifiers in kernel config.',
			recommended: false,
			url: DOC_URL,
		},
		messages: {
			missingCapability:
				'Route "{{resource}}.{{routeKey}}" uses write method {{method}} but has no capability defined. ' +
				'Without a capability, this endpoint is publicly accessible-any visitor can create, modify, or delete data. ' +
				'The framework maps capabilities to WordPress capabilities for authorization checks at runtime. ' +
				'Fix: Add capability to the route (e.g., { method: "{{method}}", path: "...", capability: { capability: "edit_posts" } }) or make the route explicitly public with capability: { public: true }. ' +
				'See {{docUrl}}.',
		},
		schema: [],
	},
	create(context) {
		const evaluator = createWPKernelConfigEvaluator(context);
		if (!evaluator.isWPKernelConfig) {
			return {};
		}

		return {
			Program() {
				const wpkConfig = evaluator.getWPKernelConfig();
				if (!wpkConfig) {
					return;
				}

				const resources = getResourcesFromConfig(wpkConfig);
				for (const resource of resources) {
					validateResourceCapabilities(context, resource);
				}
			},
		};
	},
};

function validateResourceCapabilities(context, resource) {
	if (!resource.value || resource.value.kind !== 'object') {
		return;
	}

	const routes = getRoutes(resource.value);
	for (const route of routes) {
		validateRouteCapability(context, resource, route);
	}
}

function validateRouteCapability(context, resource, route) {
	if (route.value.kind !== 'object') {
		return;
	}

	const meta = route.meta;
	const normalizedMethod = meta?.normalizedMethod;
	if (!normalizedMethod || !WRITE_METHODS.has(normalizedMethod)) {
		return;
	}

	if (meta?.hasCapability) {
		return;
	}

	const node =
		route.property.propertyNode?.value ?? route.property.propertyNode;
	// Framework constraint: Write operations should define capabilities for authorization.
	// Without a capability, this endpoint is publicly accessible-any visitor can modify data.
	// The framework maps capability.capability to WordPress current_user_can() checks at runtime.
	// Missing capabilities are a common security vulnerability. Either add a capability check
	// or explicitly mark the route as public with capability: { public: true }.
	context.report({
		node,
		messageId: 'missingCapability',
		data: {
			resource: resource.name,
			routeKey: route.key,
			method: normalizedMethod,
			docUrl: DOC_URL,
		},
	});
}
