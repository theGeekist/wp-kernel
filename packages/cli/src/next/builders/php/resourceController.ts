import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../runtime/types';
import {
	buildResourceCacheKeysPlan,
	buildResourceControllerMetadata,
	buildRestControllerModule,
	DEFAULT_DOC_HEADER,
	routeUsesIdentity,
	type ResourceControllerMetadata,
	type ResourceControllerRouteMetadata,
	type ResourceMetadataHost,
	type RestControllerModuleConfig,
	type RestControllerModuleControllerConfig,
	type RestRouteConfig,
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from '@wpkernel/php-json-ast';
import type {
	PhpBuilderChannel,
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
			}

			const moduleConfig = buildRestControllerModuleConfig({
				ir,
				resources: ir.resources,
			});

			queueResourceControllerFiles({
				config: moduleConfig,
				workspace: options.context.workspace,
				channel: getPhpBuilderChannel(options.context),
				outputDir: ir.php.outputDir,
			});

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

interface BuildRestControllerModuleConfigOptions {
	readonly ir: IRv1;
	readonly resources: readonly IRResource[];
}

function buildRestControllerModuleConfig(
	options: BuildRestControllerModuleConfigOptions
): RestControllerModuleConfig {
	const namespaceRoot = `${options.ir.php.namespace}\\Generated`;
	const namespace = `${namespaceRoot}\\Rest`;

	const controllers = options.resources.map((resource) =>
		buildControllerConfig({
			ir: options.ir,
			resource,
		})
	);

	return {
		origin: options.ir.meta.origin,
		sanitizedNamespace: options.ir.meta.sanitizedNamespace,
		namespace,
		controllers,
		includeBaseController: false,
	} satisfies RestControllerModuleConfig;
}

interface BuildControllerConfigOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
}

function buildControllerConfig(
	options: BuildControllerConfigOptions
): RestControllerModuleControllerConfig {
	const { ir, resource } = options;
	const className = `${toPascalCase(resource.name)}Controller`;
	const pascalName = toPascalCase(resource.name);
	const identity = resolveIdentityConfig(resource);
	const restArgsExpression = renderPhpValue(
		sanitizeJson(buildRestArgs(ir.schemas, resource))
	);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);

	let metadataState: ResourceControllerMetadata =
		buildResourceControllerMetadata({
			name: resource.name,
			identity,
			routes: resource.routes.map(({ method, path }) => ({
				method,
				path,
			})),
			cacheKeys: buildResourceCacheKeysPlan(resource.cacheKeys),
			mutationMetadata: resolveRouteMutationMetadata(resource),
		});

	const metadataHost: ResourceMetadataHost = {
		getMetadata: () => metadataState,
		setMetadata: (metadata) => {
			metadataState = metadata as ResourceControllerMetadata;
		},
	};

	const routes = buildRouteConfigs({
		ir,
		resource,
		identity,
		pascalName,
		metadataHost,
		routeMetadata: metadataState.routes,
		errorCodeFactory,
	});

	const helperMethods = buildStorageHelperMethods({
		resource,
		pascalName,
		identity,
		errorCodeFactory,
		ir,
	});

	return {
		className,
		resourceName: resource.name,
		schemaKey: resource.schemaKey,
		schemaProvenance: resource.schemaProvenance,
		restArgsExpression,
		identity,
		routes,
		helperMethods,
		capabilityClass: `${ir.php.namespace}\\Capability\\Capability`,
		fileName: `Rest/${className}.php`,
		metadata: metadataState,
	} satisfies RestControllerModuleControllerConfig;
}

interface QueueResourceControllerFileOptions {
	readonly config: RestControllerModuleConfig;
	readonly channel: PhpBuilderChannel;
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
}

function queueResourceControllerFiles(
	options: QueueResourceControllerFileOptions
): void {
	const result = buildRestControllerModule(options.config);

	for (const file of result.files) {
		if (file.metadata.kind !== 'resource-controller') {
			continue;
		}

		const relativeParts = file.fileName
			.split('/')
			.filter((part) => part.length > 0);

		options.channel.queue({
			file: options.workspace.resolve(
				options.outputDir,
				...relativeParts
			),
			program: file.program,
			metadata: file.metadata,
			docblock: [...DEFAULT_DOC_HEADER, ...file.docblock],
			uses: [],
			statements: [],
		});
	}
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
