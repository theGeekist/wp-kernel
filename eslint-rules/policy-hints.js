import {
	createKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
	getStringValue,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRoutes(resource) {
	const routesProperty = getObjectProperty(resource, 'routes');
	if (!routesProperty || routesProperty.value.kind !== 'object') {
		return [];
	}

	return Array.from(routesProperty.value.properties.entries()).map(
		([key, property]) => ({
			key,
			property,
			value: property.value,
		})
	);
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
		const evaluator = createKernelConfigEvaluator(context);
		if (!evaluator.isKernelConfig) {
			return {};
		}

		return {
			Program() {
				const kernelConfig = evaluator.getKernelConfig();
				if (!kernelConfig) {
					return;
				}

				const resources = getResourcesFromConfig(kernelConfig);
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

	const method = getMethod(route.value);
	if (!method || !WRITE_METHODS.has(method.toUpperCase())) {
		return;
	}

	if (hasPolicy(route.value)) {
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
			method: method.toUpperCase(),
			docUrl: DOC_URL,
		},
	});
}
