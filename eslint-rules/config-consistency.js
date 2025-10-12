import {
	createKernelConfigEvaluator,
	getObjectProperty,
	getResourcesFromConfig,
	getStringValue,
} from './utils/kernel-config-evaluator.js';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety';

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
				'Resource "{{resource}}" identity parameter ":{{param}}" is not present in any configured route. See {{docUrl}}.',
			duplicateRoute:
				'Resource "{{resource}}" defines duplicate REST route for {{method}} {{path}}. Adjust routes or consolidate methods. See {{docUrl}}.',
			missingPostType:
				'Resource "{{resource}}" uses wp-post storage but is missing a postType. Add storage.postType to align with generators. See {{docUrl}}.',
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
