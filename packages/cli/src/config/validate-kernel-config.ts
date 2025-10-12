import { KernelError, type Reporter } from '@geekist/wp-kernel';
import type { ResourceConfig } from '@geekist/wp-kernel/resource';
import { sanitizeNamespace } from '@geekist/wp-kernel/namespace';
import * as t from 'typanion';
import type { KernelConfigV1, KernelConfigVersion } from './types';

interface ValidateKernelConfigOptions {
	reporter: Reporter;
	sourcePath: string;
	origin: string;
}

interface ValidateKernelConfigResult {
	config: KernelConfigV1;
	namespace: string;
}

type KernelConfigCandidate = Omit<KernelConfigV1, 'version' | 'namespace'> & {
	version?: KernelConfigVersion;
	namespace: string;
};

const httpMethodValidator = t.isEnum([
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
] as const);

const functionValidator = t.makeValidator<
	unknown,
	(...args: unknown[]) => unknown
>({
	test: (value): value is (...args: unknown[]) => unknown =>
		typeof value === 'function',
});

const resourceRouteValidator = t.isObject(
	{
		path: t.isString(),
		method: httpMethodValidator,
		policy: t.isOptional(t.isString()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

export const resourceRoutesValidator = t.cascade(
	t.isObject(
		{
			list: t.isOptional(resourceRouteValidator),
			get: t.isOptional(resourceRouteValidator),
			create: t.isOptional(resourceRouteValidator),
			update: t.isOptional(resourceRouteValidator),
			remove: t.isOptional(resourceRouteValidator),
		},
		{ extra: t.isRecord(t.isUnknown()) }
	),
	(value, state) => {
		const hasRoute = Object.values(value).some(
			(route) => typeof route !== 'undefined'
		);
		if (!hasRoute) {
			state?.errors?.push(
				'resources[].routes must define at least one operation.'
			);
			return false;
		}
		return true;
	}
);

const identityNumberValidator = t.isObject(
	{
		type: t.isLiteral('number'),
		param: t.isOptional(t.isLiteral('id')),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const identityStringValidator = t.isObject(
	{
		type: t.isLiteral('string'),
		param: t.isOptional(t.isEnum(['id', 'slug', 'uuid'] as const)),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceIdentityValidator = t.isOptional(
	t.isOneOf([identityNumberValidator, identityStringValidator])
);

const storageTransientValidator = t.isObject(
	{
		mode: t.isLiteral('transient'),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostMetaValidator = t.isObject(
	{
		type: t.isEnum([
			'string',
			'integer',
			'number',
			'boolean',
			'array',
			'object',
		] as const),
		single: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostTaxonomyValidator = t.isObject(
	{
		taxonomy: t.isString(),
		hierarchical: t.isOptional(t.isBoolean()),
		register: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storagePostValidator = t.isObject(
	{
		mode: t.isLiteral('wp-post'),
		postType: t.isOptional(t.isString()),
		statuses: t.isOptional(t.isArray(t.isString())),
		supports: t.isOptional(
			t.isArray(
				t.isEnum([
					'title',
					'editor',
					'excerpt',
					'custom-fields',
				] as const)
			)
		),
		meta: t.isOptional(t.isRecord(storagePostMetaValidator)),
		taxonomies: t.isOptional(t.isRecord(storagePostTaxonomyValidator)),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storageTaxonomyValidator = t.isObject(
	{
		mode: t.isLiteral('wp-taxonomy'),
		taxonomy: t.isString(),
		hierarchical: t.isOptional(t.isBoolean()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const storageOptionValidator = t.isObject(
	{
		mode: t.isLiteral('wp-option'),
		option: t.isString(),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceStorageValidator = t.isOptional(
	t.isOneOf([
		storageTransientValidator,
		storagePostValidator,
		storageTaxonomyValidator,
		storageOptionValidator,
	])
);

const schemaConfigValidator = t.isObject(
	{
		path: t.isString(),
		generated: t.isObject(
			{
				types: t.isString(),
			},
			{ extra: t.isRecord(t.isUnknown()) }
		),
		description: t.isOptional(t.isString()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const adaptersValidator = t.isObject(
	{
		php: t.isOptional(
			t.makeValidator<unknown, (...args: unknown[]) => unknown>({
				test: (value): value is (...args: unknown[]) => unknown =>
					typeof value === 'function',
			})
		),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsMenuValidator = t.isObject(
	{
		slug: t.isString(),
		title: t.isString(),
		capability: t.isOptional(t.isString()),
		parent: t.isOptional(t.isString()),
		position: t.isOptional(t.isNumber()),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsScreenValidator = t.isObject(
	{
		component: t.isOptional(t.isString()),
		route: t.isOptional(t.isString()),
		resourceImport: t.isOptional(t.isString()),
		resourceSymbol: t.isOptional(t.isString()),
		kernelImport: t.isOptional(t.isString()),
		kernelSymbol: t.isOptional(t.isString()),
		menu: t.isOptional(resourceDataViewsMenuValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceDataViewsConfigValidator = t.isObject(
	{
		fields: t.isOptional(t.isArray(t.isRecord(t.isUnknown()))),
		defaultView: t.isOptional(t.isRecord(t.isUnknown())),
		actions: t.isOptional(t.isArray(t.isRecord(t.isUnknown()))),
		mapQuery: t.isOptional(functionValidator),
		search: t.isOptional(t.isBoolean()),
		searchLabel: t.isOptional(t.isString()),
		getItemId: t.isOptional(functionValidator),
		empty: t.isOptional(t.isUnknown()),
		perPageSizes: t.isOptional(t.isArray(t.isNumber())),
		defaultLayouts: t.isOptional(t.isRecord(t.isUnknown())),
		preferencesKey: t.isOptional(t.isString()),
		screen: t.isOptional(resourceDataViewsScreenValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceAdminUIValidator = t.isObject(
	{
		view: t.isOptional(t.isString()),
		dataviews: t.isOptional(resourceDataViewsConfigValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceUIValidator = t.isObject(
	{
		admin: t.isOptional(resourceAdminUIValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const resourceConfigValidator = t.isObject(
	{
		name: t.isString(),
		routes: resourceRoutesValidator,
		identity: resourceIdentityValidator,
		storage: resourceStorageValidator,
		cacheKeys: t.isOptional(t.isRecord(t.isUnknown())),
		queryParams: t.isOptional(t.isRecord(t.isUnknown())),
		store: t.isOptional(
			t.isObject({}, { extra: t.isRecord(t.isUnknown()) })
		),
		namespace: t.isOptional(t.isString()),
		schema: t.isOptional(t.isUnknown()),
		reporter: t.isOptional(t.isUnknown()),
		ui: t.isOptional(resourceUIValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

const kernelConfigValidator = t.isObject(
	{
		version: t.isOptional(t.isLiteral(1)),
		namespace: t.isString(),
		schemas: t.isRecord(schemaConfigValidator),
		resources: t.isRecord(resourceConfigValidator),
		adapters: t.isOptional(adaptersValidator),
	},
	{ extra: t.isRecord(t.isUnknown()) }
);

export function validateKernelConfig(
	rawConfig: unknown,
	options: ValidateKernelConfigOptions
): ValidateKernelConfigResult {
	const validationReporter = options.reporter.child('validation');

	const validation = t.as(rawConfig, kernelConfigValidator, { errors: true });
	if (validation.errors) {
		const validationErrorList = Array.isArray(validation.errors)
			? validation.errors
			: undefined;
		const message = formatValidationErrors(
			validationErrorList ?? [],
			options.sourcePath,
			options.origin
		);
		validationReporter.error(message, {
			errors: validationErrorList,
			sourcePath: options.sourcePath,
			origin: options.origin,
		});
		throw new KernelError('ValidationError', {
			message,
			context: {
				sourcePath: options.sourcePath,
				origin: options.origin,
			},
		});
	}

	const candidate = validation.value as KernelConfigCandidate;
	const version = normalizeVersion(
		candidate.version,
		validationReporter,
		options.sourcePath
	);

	const sanitizedNamespace = sanitizeNamespace(candidate.namespace);
	if (!sanitizedNamespace) {
		const message = `Invalid namespace "${candidate.namespace}" in ${options.sourcePath}. Namespaces must be lowercase kebab-case and avoid reserved words.`;
		validationReporter.error(message, {
			namespace: candidate.namespace,
			sourcePath: options.sourcePath,
		});
		throw new KernelError('ValidationError', {
			message,
			context: {
				sourcePath: options.sourcePath,
				origin: options.origin,
			},
		});
	}

	if (sanitizedNamespace !== candidate.namespace) {
		validationReporter.warn(
			`Namespace "${candidate.namespace}" sanitised to "${sanitizedNamespace}" for CLI usage.`,
			{
				original: candidate.namespace,
				sanitized: sanitizedNamespace,
			}
		);
	}

	for (const [resourceName, resource] of Object.entries(
		candidate.resources
	)) {
		runResourceChecks(
			resourceName,
			resource as ResourceConfig,
			validationReporter
		);
	}

	const config: KernelConfigV1 = {
		...candidate,
		version,
		namespace: sanitizedNamespace,
	} as KernelConfigV1;

	return {
		config,
		namespace: sanitizedNamespace,
	};
}

export function normalizeVersion(
	version: KernelConfigVersion | undefined,
	reporter: Reporter,
	sourcePath: string
): KernelConfigVersion {
	if (typeof version === 'undefined') {
		reporter.warn(
			`Kernel config at ${sourcePath} is missing "version". Defaulting to 1. Add \`version: 1\` to opt into CLI tooling guarantees.`,
			{ sourcePath }
		);
		return 1;
	}

	if (version !== 1) {
		const message = `Unsupported kernel config version ${String(version)} in ${sourcePath}. Only version 1 is supported.`;
		reporter.error(message, { sourcePath, version });
		throw new KernelError('ValidationError', {
			message,
			context: {
				sourcePath,
				version,
			},
		});
	}

	return version;
}

export function runResourceChecks(
	resourceName: string,
	resource: ResourceConfig,
	reporter: Reporter
): void {
	const identity = resource.identity;
	if (identity) {
		const expectedParam = identity.param ?? 'id';
		const routes = Object.values(resource.routes).filter(
			(route): route is NonNullable<typeof route> =>
				typeof route !== 'undefined'
		);

		if (routes.length === 0) {
			reporter.warn(
				`Resource "${resourceName}" defines identity metadata but no routes. Identity inference will be skipped.`,
				{ resourceName }
			);
		} else {
			const hasMatchingParam = routes.some((route) =>
				route.path.includes(`:${expectedParam}`)
			);
			if (!hasMatchingParam) {
				const message = `Identity param ":${expectedParam}" for resource "${resourceName}" is not present in any configured route.`;
				reporter.error(message, {
					resourceName,
					identity,
					routes,
				});
				throw new KernelError('ValidationError', {
					message,
					context: {
						resourceName,
						param: expectedParam,
					},
				});
			}
		}
	}

	if (resource.storage?.mode === 'wp-post' && !resource.storage.postType) {
		reporter.warn(
			`Resource "${resourceName}" uses wp-post storage without specifying "postType". Generators will derive a default from the namespace.`,
			{ resourceName }
		);
	}
}

export function formatValidationErrors(
	errors: string[] | undefined,
	sourcePath: string,
	origin: string
): string {
	if (!errors || errors.length === 0) {
		return `Invalid kernel config discovered in ${sourcePath} (${origin}).`;
	}

	const formatted = errors.map((error) => ` - ${error}`).join('\n');
	return `Invalid kernel config discovered in ${sourcePath} (${origin}):\n${formatted}`;
}
