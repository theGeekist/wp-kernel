import {
	createKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
	getStringValue,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules';

function pathContainsParam(path, param) {
	if (!path || !param) {
		return false;
	}

	const pattern = new RegExp(`:${param}(?:[/?]|$)`);
	return pattern.test(path);
}

function reportMissingIdentity(context, resourceName, param, property) {
	const node =
		property?.propertyNode?.value ??
		property?.propertyNode ??
		property?.keyNode;

	// Framework constraint: Identity parameters must appear in at least one route path.
	// The framework generates RESTful routes from identity (e.g., :id → /jobs/:id).
	// Missing identity parameters in routes means GET/UPDATE/DELETE operations for individual
	// items will fail at runtime because WordPress can't match the route pattern.
	context.report({
		node,
		messageId: 'missingIdentityRoute',
		data: {
			resource: resourceName,
			param,
			docUrl: DOC_URL,
		},
	});
}

function reportDuplicateRoute(context, resourceName, method, path, property) {
	const node =
		property?.propertyNode?.value ??
		property?.propertyNode ??
		property?.keyNode;

	// Framework constraint: Each route must have a unique {method, path} combination.
	// WordPress REST API only registers the last route when duplicates exist, making earlier
	// routes unreachable. This causes unpredictable behavior where operations silently fail.
	// Users expect all defined routes to work, but only the last duplicate actually registers.
	context.report({
		node,
		messageId: 'duplicateRoute',
		data: {
			resource: resourceName,
			method,
			path,
			docUrl: DOC_URL,
		},
	});
}

function reportMissingPostType(context, resourceName, property) {
	const node =
		property?.propertyNode?.value ??
		property?.propertyNode ??
		property?.keyNode;

	// Framework constraint: wp-post storage requires storage.postType for PHP generation.
	// The PHP generators create register_post_type() calls from this value. Without postType,
	// the custom post type won't be registered in WordPress, causing all database operations
	// (CREATE, UPDATE, DELETE) to fail silently. Data appears to save but never persists.
	context.report({
		node,
		messageId: 'missingPostType',
		data: {
			resource: resourceName,
			docUrl: DOC_URL,
		},
	});
}

function getRoutes(evaluatedResource) {
	const routesProperty = getObjectProperty(evaluatedResource, 'routes');
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

function getRouteMeta(routeProperty) {
	if (
		!routeProperty ||
		!routeProperty.value ||
		routeProperty.value.kind !== 'object'
	) {
		return null;
	}

	const pathValue = getStringValue(
		getObjectProperty(routeProperty.value, 'path')?.value
	);
	const methodValue = getStringValue(
		getObjectProperty(routeProperty.value, 'method')?.value
	);

	return {
		path: pathValue,
		method: methodValue,
	};
}

function getIdentityMetadata(resource) {
	const identityProperty = getObjectProperty(resource, 'identity');
	if (!identityProperty || identityProperty.value.kind !== 'object') {
		return null;
	}

	const param =
		getStringValue(
			getObjectProperty(identityProperty.value, 'param')?.value
		) ?? 'id';

	return {
		param,
		property: identityProperty,
	};
}

function getStorageMetadata(resource) {
	const storageProperty = getObjectProperty(resource, 'storage');
	if (!storageProperty || storageProperty.value.kind !== 'object') {
		return null;
	}

	const mode = getStringValue(
		getObjectProperty(storageProperty.value, 'mode')?.value
	);

	return {
		mode,
		property: storageProperty,
	};
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensures kernel resources have consistent identity hints, unique routes, and valid wp-post metadata.',
			recommended: false,
			url: DOC_URL,
		},
		messages: {
			missingIdentityRoute:
				'Resource "{{resource}}" declares identity parameter ":{{param}}" but it doesn\'t appear in any route path. ' +
				'The framework uses identity parameters to generate RESTful routes like /wp-json/app/v1/{{resource}}/:{{param}}. ' +
				'Without a matching route, GET/UPDATE/DELETE operations for individual items will fail at runtime. ' +
				'Fix: Add a route with path containing ":{{param}}" (e.g., { method: "GET", path: "/{{resource}}/:{{param}}" }) or remove the identity parameter. ' +
				'See {{docUrl}}.',
			duplicateRoute:
				'Resource "{{resource}}" defines duplicate REST route for {{method}} {{path}}. ' +
				'WordPress REST API only registers the last duplicate route, causing the first to be unreachable. ' +
				'This creates unpredictable routing behavior where some operations silently fail. ' +
				'Fix: Consolidate operations into one route, use different paths, or change HTTP methods. ' +
				'See {{docUrl}}.',
			missingPostType:
				'Resource "{{resource}}" uses wp-post storage (storage.type = "wp-post") but is missing storage.postType. ' +
				'The PHP generators require postType to create the custom post type registration in WordPress. ' +
				"Without it, your resource won't persist to the database and all CREATE/UPDATE operations will fail silently. " +
				'Fix: Add storage.postType (e.g., storage: { type: "wp-post", postType: "job_listing" }). Use lowercase with underscores. ' +
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
					validateResource(context, resource);
				}
			},
		};
	},
};

function validateResource(context, resource) {
	if (!resource.value || resource.value.kind !== 'object') {
		return;
	}

	const identity = getIdentityMetadata(resource.value);
	const routes = getRoutes(resource.value);

	validateIdentity(context, resource, identity, routes);
	reportDuplicateRoutes(context, resource, routes);
	validateStorage(context, resource, getStorageMetadata(resource.value));
}

function validateIdentity(context, resource, identity, routes) {
	if (!identity || routes.length === 0) {
		return;
	}

	const matches = routes.some((route) => {
		const meta = getRouteMeta(route.property);
		return Boolean(
			meta?.path && pathContainsParam(meta.path, identity.param)
		);
	});

	if (!matches) {
		reportMissingIdentity(
			context,
			resource.name,
			identity.param,
			identity.property
		);
	}
}

function reportDuplicateRoutes(context, resource, routes) {
	if (routes.length === 0) {
		return;
	}

	const seen = new Map();
	for (const route of routes) {
		if (route.value.kind !== 'object') {
			continue;
		}

		const meta = getRouteMeta(route.property);
		if (!meta?.method || !meta.path) {
			continue;
		}

		const comboKey = `${meta.method.toUpperCase()} ${meta.path}`;
		if (seen.has(comboKey)) {
			reportDuplicateRoute(
				context,
				resource.name,
				meta.method,
				meta.path,
				route.property
			);
		} else {
			seen.set(comboKey, route.property);
		}
	}
}

function validateStorage(context, resource, storage) {
	if (storage?.mode !== 'wp-post') {
		return;
	}

	const postType = getStringValue(
		getObjectProperty(storage.property.value, 'postType')?.value
	);

	if (!postType) {
		reportMissingPostType(context, resource.name, storage.property);
	}
}
