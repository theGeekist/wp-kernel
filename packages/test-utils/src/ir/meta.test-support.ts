import type { IRPluginMeta, IRResource } from '@wpkernel/cli/ir/publicTypes';
import type { IRResourceLike } from '../types.js';

const FALLBACK_NAMESPACE = 'demo-plugin';

function sanitiseNamespace(value: string | undefined): string {
	if (!value) {
		return FALLBACK_NAMESPACE;
	}

	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug.length > 0 ? slug : FALLBACK_NAMESPACE;
}

function buildTitleFromNamespace(namespace: string): string {
	return namespace
		.split('-')
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join(' ');
}

const trim = (value?: string): string | undefined =>
	value?.trim() ? value.trim() : undefined;

const withFallback = (value: string | undefined, fallback: string): string =>
	trim(value) ?? fallback;

export function buildPluginMetaFixture({
	namespace,
	overrides = {},
}: {
	namespace?: string;
	overrides?: Partial<IRPluginMeta>;
} = {}): IRPluginMeta {
	const sanitized = sanitiseNamespace(namespace);
	const name = withFallback(
		overrides.name,
		buildTitleFromNamespace(sanitized)
	);
	const description = withFallback(
		overrides.description,
		`Bootstrap loader for the ${name} WPKernel integration.`
	);

	return {
		name,
		description,
		version: withFallback(overrides.version, '0.1.0'),
		requiresAtLeast: withFallback(overrides.requiresAtLeast, '6.7'),
		requiresPhp: withFallback(overrides.requiresPhp, '8.1'),
		textDomain: withFallback(overrides.textDomain, sanitized),
		author: withFallback(overrides.author, 'WPKernel Contributors'),
		authorUri: trim(overrides.authorUri),
		pluginUri: trim(overrides.pluginUri),
		license: withFallback(overrides.license, 'GPL-2.0-or-later'),
		licenseUri: trim(overrides.licenseUri),
	};
}

function toPascalCase(value: string): string {
	return value
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

export function buildControllerClassName(
	namespace: string,
	resourceName: string
): string {
	const phpNamespace = namespace
		.split('-')
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('\\');

	const resourceClass = toPascalCase(resourceName);

	return `${phpNamespace}\\Generated\\Rest\\${resourceClass}Controller`;
}

export function withControllerClass<
	TResource extends IRResourceLike | IRResource,
>(resource: TResource, namespace: string): TResource {
	if ((resource as IRResource).controllerClass) {
		return resource;
	}

	return {
		...resource,
		controllerClass: buildControllerClassName(namespace, resource.name),
	};
}
