import {
	createWPKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
	getStringValue,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules';

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
					hasPolicy: hasPolicy(value),
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

function hasPolicy(route) {
	if (!route || route.kind !== 'object') {
		return false;
	}

	const policy = getObjectProperty(route, 'policy');
	if (!policy) {
		return false;
	}

	const policyValue = getStringValue(policy.value);
	return typeof policyValue === 'string' && policyValue.length > 0;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Warns when write routes lack policy identifiers in kernel config.',
			recommended: false,
			url: DOC_URL,
		},
		messages: {
			missingPolicy:
				'Route "{{resource}}.{{routeKey}}" uses write method {{method}} but has no policy defined. ' +
				'Without a policy, this endpoint is publicly accessible—any visitor can create, modify, or delete data. ' +
				'The framework maps policies to WordPress capabilities for authorization checks at runtime. ' +
				'Fix: Add policy to the route (e.g., { method: "{{method}}", path: "...", policy: { capability: "edit_posts" } }) or make the route explicitly public with policy: { public: true }. ' +
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
					validateResourcePolicies(context, resource);
				}
			},
		};
	},
};

function validateResourcePolicies(context, resource) {
	if (!resource.value || resource.value.kind !== 'object') {
		return;
	}

	const routes = getRoutes(resource.value);
	for (const route of routes) {
		validateRoutePolicy(context, resource, route);
	}
}

function validateRoutePolicy(context, resource, route) {
	if (route.value.kind !== 'object') {
		return;
	}

	const meta = route.meta;
	const normalizedMethod = meta?.normalizedMethod;
	if (!normalizedMethod || !WRITE_METHODS.has(normalizedMethod)) {
		return;
	}

	if (meta?.hasPolicy) {
		return;
	}

	const node =
		route.property.propertyNode?.value ?? route.property.propertyNode;
	// Framework constraint: Write operations should define policies for authorization.
	// Without a policy, this endpoint is publicly accessible—any visitor can modify data.
	// The framework maps policy.capability to WordPress current_user_can() checks at runtime.
	// Missing policies are a common security vulnerability. Either add a capability check
	// or explicitly mark the route as public with policy: { public: true }.
	context.report({
		node,
		messageId: 'missingPolicy',
		data: {
			resource: resource.name,
			routeKey: route.key,
			method: normalizedMethod,
			docUrl: DOC_URL,
		},
	});
}
