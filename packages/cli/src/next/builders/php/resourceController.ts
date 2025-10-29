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
	buildResourceCacheKeysPlan,
	buildResourceControllerMetadata,
	buildRestControllerClass,
	buildRestControllerDocblock,
	createWpPhpFileBuilder,
	routeUsesIdentity,
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
import { buildRestArgs } from './resourceController/restArgs';
import { buildRouteMethodName } from './resourceController/routeNaming';
import { buildNotImplementedStatements } from './resourceController/stubs';
import { buildRouteKindStatements } from './resourceController/routes/handleRouteKind';
import { buildWpTaxonomyHelperMethods } from './resource/wpTaxonomy';
import { buildWpOptionHelperMethods } from './resource/wpOption';
import { buildTransientHelperMethods } from './resource/transient';
import { WP_POST_MUTATION_CONTRACT } from './resource/wpPost/mutations';
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
				warnOnMissingCapabilities({ reporter, resource });
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

function warnOnMissingCapabilities(options: {
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly resource: IRResource;
}): void {
	const { reporter, resource } = options;

	for (const route of resource.routes) {
		if (!isWriteRoute(route.method) || route.capability) {
			continue;
		}

		reporter.warn('Write route missing capability.', {
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
	const routeMetadataSource = buildResourceControllerMetadata({
		name: resource.name,
		identity,
		routes: resource.routes.map(({ method, path }) => ({ method, path })),
		cacheKeys: buildResourceCacheKeysPlan(resource.cacheKeys),
		mutationMetadata: resolveRouteMutationMetadata(resource),
	});

	appendGeneratedFileDocblock(
		builder,
		buildRestControllerDocblock({
			origin: ir.meta.origin,
			resourceName: resource.name,
			schemaKey: resource.schemaKey,
			schemaProvenance: resource.schemaProvenance,
			routes: routeMetadataSource.routes,
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
		routeMetadata: routeMetadataSource.routes,
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
		capabilityClass: `${ir.php.namespace}\Capability\Capability`,
	});

	for (const use of uses) {
		builder.addUse(use);
	}

	builder.appendProgramStatement(classNode);

	builder.setMetadata(routeMetadataSource);
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
		const metadata =
			options.routeMetadata[index] ??
			({
				method: route.method,
				path: route.path,
				kind: 'custom',
			} satisfies ResourceControllerRouteMetadata);

		const usesIdentity = routeUsesIdentity({
			route: { method: route.method, path: route.path },
			routeKind: metadata.kind,
			identity: { param: options.identity.param },
		});

		const handledStatements = buildRouteKindStatements({
			resource: options.resource,
			route,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			metadataHost: options.metadataHost,
			cacheSegments: metadata.cacheSegments ?? [],
			routeKind: metadata.kind,
		});

		const statements =
			handledStatements && handledStatements.length > 0
				? handledStatements
				: buildNotImplementedStatements(route);

		return {
			methodName: buildRouteMethodName(route, options.ir),
			metadata,
			capability: route.capability,
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

function resolveRouteMutationMetadata(
	resource: IRResource
): { readonly channelTag: string } | undefined {
	if (resource.storage?.mode === 'wp-post') {
		return {
			channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
		};
	}

	return undefined;
}
