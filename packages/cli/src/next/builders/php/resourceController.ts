import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendGeneratedFileDocblock,
	buildRestControllerClass,
	buildRestControllerDocblock,
	createWpPhpFileBuilder,
	type PhpFileMetadata,
	type ResourceControllerRouteMetadata,
	type ResourceMetadataHost,
	type RestRouteConfig,
} from '@wpkernel/wp-json-ast';
import type {
	PhpAstBuilderAdapter,
	PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import { makeErrorCodeFactory, sanitizeJson, toPascalCase } from './utils';
import type { IRResource, IRv1 } from '../../ir/publicTypes';
import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import { collectCanonicalBasePaths } from './routes';
import { buildRestArgs } from './resourceController/restArgs';
import {
	buildRouteMetadata,
	type RouteMetadataKind,
} from './resourceController/metadata';
import { buildRouteMethodName } from './resourceController/routeNaming';
import { routeUsesIdentity } from './resourceController/routeIdentity';
import { buildNotImplementedStatements } from './resourceController/stubs';
import { buildRouteKindStatements } from './resourceController/routes/handleRouteKind';
import { buildWpTaxonomyHelperMethods } from './resource/wpTaxonomy';
import { buildWpOptionHelperMethods } from './resource/wpOption';
import { buildTransientHelperMethods } from './resource/transient';
import { renderPhpValue } from './resource/phpValue';

export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;
			if (ir.resources.length === 0) {
				reporter.debug(
					'createPhpResourceControllerHelper: no resources discovered.'
				);
				await next?.();
				return;
			}

			for (const resource of ir.resources) {
				warnOnMissingPolicies({ reporter, resource });
				const namespaceRoot = `${ir.php.namespace}\\Generated`;
				const namespace = `${namespaceRoot}\\Rest`;
				const className = `${toPascalCase(resource.name)}Controller`;
				const filePath = options.context.workspace.resolve(
					ir.php.outputDir,
					'Rest',
					`${className}.php`
				);
				const identity = resolveIdentityConfig(resource);

				const helper = createWpPhpFileBuilder<
					PipelineContext,
					BuilderInput,
					BuilderOutput
				>({
					key: `resource-controller.${resource.name}`,
					filePath,
					namespace,
					metadata: {
						kind: 'resource-controller',
						name: resource.name,
						identity,
						routes: [],
					},
					build: (builder) => {
						buildResourceController({
							builder,
							ir,
							resource,
							className,
							identity,
						});
					},
				});

				await helper.apply(options);
			}

			await next?.();
		},
	});
}

function warnOnMissingPolicies(options: {
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly resource: IRResource;
}): void {
	const { reporter, resource } = options;

	for (const route of resource.routes) {
		if (!isWriteRoute(route.method) || route.policy) {
			continue;
		}

		reporter.warn('Write route missing policy.', {
			resource: resource.name,
			method: route.method,
			path: route.path,
		});
	}
}

function isWriteRoute(method: string): boolean {
	switch (method.toUpperCase()) {
		case 'POST':
		case 'PUT':
		case 'PATCH':
		case 'DELETE':
			return true;
		default:
			return false;
	}
}

interface BuildResourceControllerOptions {
	readonly builder: PhpAstBuilderAdapter;
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly className: string;
	readonly identity: ResolvedIdentity;
}

function buildResourceController(
	options: BuildResourceControllerOptions
): void {
	const { builder, ir, resource, className, identity } = options;
	const pascalName = toPascalCase(resource.name);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);
	const metadataHost: ResourceMetadataHost = {
		getMetadata: () => builder.getMetadata() as PhpFileMetadata,
		setMetadata: (metadata) => builder.setMetadata(metadata),
	};
	const canonicalBasePaths = collectCanonicalBasePaths(
		resource.routes,
		identity.param
	);
	const routeMetadata = buildRouteMetadata({
		routes: resource.routes,
		identity,
		canonicalBasePaths,
		resource,
	});

	appendGeneratedFileDocblock(
		builder,
		buildRestControllerDocblock({
			origin: ir.meta.origin,
			resourceName: resource.name,
			schemaKey: resource.schemaKey,
			schemaProvenance: resource.schemaProvenance,
			routes: routeMetadata,
		})
	);

	const restArgsExpression = renderPhpValue(
		sanitizeJson(buildRestArgs(ir.schemas, resource))
	);
	const routeConfigs = buildRouteConfigs({
		ir,
		resource,
		identity,
		pascalName,
		metadataHost,
		routeMetadata,
		errorCodeFactory,
	});
	const helperMethods = buildStorageHelperMethods({
		resource,
		pascalName,
		identity,
		errorCodeFactory,
		ir,
	});
	const { classNode, uses } = buildRestControllerClass({
		className,
		resourceName: resource.name,
		schemaKey: resource.schemaKey,
		restArgsExpression,
		identity,
		routes: routeConfigs,
		helperMethods,
		policyClass: `${ir.php.namespace}\Policy\Policy`,
	});

	for (const use of uses) {
		builder.addUse(use);
	}

	builder.appendProgramStatement(classNode);

	builder.setMetadata({
		kind: 'resource-controller',
		name: resource.name,
		identity,
		routes: routeMetadata,
	});
}

interface BuildRouteConfigsOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly metadataHost: ResourceMetadataHost;
	readonly routeMetadata: readonly ResourceControllerRouteMetadata[];
	readonly errorCodeFactory: (suffix: string) => string;
}

function buildRouteConfigs(
	options: BuildRouteConfigsOptions
): RestRouteConfig[] {
	return options.resource.routes.map((route, index) => {
		const routeKind = options.routeMetadata[index]?.kind ?? 'custom';
		const metadata =
			options.routeMetadata[index] ??
			({
				method: route.method,
				path: route.path,
				kind: routeKind,
			} satisfies ResourceControllerRouteMetadata);

		const usesIdentity = routeUsesIdentity({
			route,
			routeKind,
			identity: options.identity,
		});

		const handledStatements = buildRouteKindStatements({
			resource: options.resource,
			route,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: options.metadataHost,
			cacheSegments: resolveCacheSegments(
				routeKind,
				options.resource,
				options.routeMetadata[index]
			),
			routeKind,
		});

		const statements =
			handledStatements && handledStatements.length > 0
				? handledStatements
				: buildNotImplementedStatements(route);

		return {
			methodName: buildRouteMethodName(route, options.ir),
			metadata,
			policy: route.policy,
			usesIdentity,
			statements,
		} satisfies RestRouteConfig;
	});
}

interface BuildStorageHelperMethodsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly ir: IRv1;
}

function buildStorageHelperMethods(
	options: BuildStorageHelperMethodsOptions
): readonly PhpStmtClassMethod[] {
	const storageMode = options.resource.storage?.mode;

	if (storageMode === 'wp-taxonomy') {
		const taxonomyHelpers = buildWpTaxonomyHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
			identity: options.identity,
			errorCodeFactory: options.errorCodeFactory,
		});

		return taxonomyHelpers.map((method) => method.node);
	}

	if (storageMode === 'transient') {
		const namespace =
			options.ir.meta.sanitizedNamespace ??
			options.ir.meta.namespace ??
			'';

		return buildTransientHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
			namespace,
		});
	}

	if (storageMode === 'wp-option') {
		return buildWpOptionHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
		});
	}

	return [];
}

function resolveCacheSegments(
	routeKind: RouteMetadataKind,
	resource: IRResource,
	routeMetadata: ResourceControllerRouteMetadata | undefined
): readonly unknown[] {
	if (routeMetadata?.cacheSegments !== undefined) {
		return routeMetadata.cacheSegments;
	}

	if (routeKind === 'list') {
		return resource.cacheKeys.list.segments;
	}

	if (routeKind === 'get') {
		return resource.cacheKeys.get.segments;
	}

	return resolveMutationCacheSegments(routeKind, resource);
}

function resolveMutationCacheSegments(
	routeKind: RouteMetadataKind,
	resource: IRResource
): readonly unknown[] {
	if (routeKind === 'create') {
		return resource.cacheKeys.create?.segments ?? [];
	}

	if (routeKind === 'update') {
		return resource.cacheKeys.update?.segments ?? [];
	}

	if (routeKind === 'remove') {
		return resource.cacheKeys.remove?.segments ?? [];
	}

	return [];
}
