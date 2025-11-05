import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../runtime/types';
import {
	buildProgramTargetPlanner,
	buildResourceCacheKeysPlan,
	buildResourceControllerRouteMetadata,
	buildResourceControllerRouteSet,
	buildRestControllerModuleFromPlan,
	collectCanonicalBasePaths,
	type BuildResourceControllerRouteSetOptions,
	type ResourceControllerRouteMetadata,
	type RestControllerResourcePlan,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRoutePlan,
	type RestControllerRouteTransientHandlers,
	DEFAULT_DOC_HEADER,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';
import type { PhpBuilderChannel } from './channel';
import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast';
import { makeErrorCodeFactory, sanitizeJson, toPascalCase } from './utils';
import type { IRResource, IRv1 } from '../../ir/publicTypes';
import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import { buildRestArgs } from './resourceController/restArgs';
import { buildRouteMethodName } from './resourceController/routeNaming';
import { buildRouteSetOptions } from './resourceController/routes/buildRouteSetOptions';
import { renderPhpValue } from '@wpkernel/wp-json-ast';
import {
	getWpPostRouteHelperState,
	readWpPostRouteBundle,
	type WpPostRouteHelperState,
} from './routes';
import {
	getResourceStorageHelperState,
	type ResourceStorageHelperState,
} from './storageHelpers';

/**
 * Creates a PHP builder helper for resource-specific REST controllers.
 *
 * This helper iterates through each resource defined in the IR and generates
 * a corresponding REST controller. It integrates with various storage helpers
 * (transient, wp-option, wp-taxonomy, wp-post) to provide appropriate CRUD
 * operations for each resource.
 *
 * @category PHP Builder
 * @returns A `BuilderHelper` instance for generating resource REST controllers.
 */
export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.controller.resources.storage.transient',
			'builder.generate.php.controller.resources.storage.wpOption',
			'builder.generate.php.controller.resources.storage.wpTaxonomy',
			'builder.generate.php.controller.resources.wpPostRoutes',
		],
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

			const storageState = getResourceStorageHelperState(options.context);
			const wpPostRoutesState = getWpPostRouteHelperState(
				options.context
			);

			const moduleResult = buildRestControllerModuleFromPlan({
				origin: ir.meta.origin,
				pluginNamespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				capabilityClass: `${ir.php.namespace}\\Generated\\Capability\\Capability`,
				resources: buildResourcePlans({
					ir,
					storageState,
					wpPostRoutesState,
					reporter,
				}),
				includeBaseController: false,
			});

			queueResourceControllerFiles({
				files: moduleResult.files,
				workspace: options.context.workspace,
				channel: getPhpBuilderChannel(options.context),
				outputDir: ir.php.outputDir,
			});

			await next?.();
		},
	});
}

interface WarnOnMissingCapabilitiesOptions {
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly resource: IRResource;
}

function warnOnMissingCapabilities(
	options: WarnOnMissingCapabilitiesOptions
): void {
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

interface QueueResourceControllerFileOptions {
	readonly files: ReturnType<
		typeof buildRestControllerModuleFromPlan
	>['files'];
	readonly channel: PhpBuilderChannel;
	readonly workspace: PipelineContext['workspace'];
	readonly outputDir: string;
}

function queueResourceControllerFiles(
	options: QueueResourceControllerFileOptions
): void {
	const planner = buildProgramTargetPlanner({
		workspace: options.workspace,
		outputDir: options.outputDir,
		channel: options.channel,
		docblockPrefix: DEFAULT_DOC_HEADER,
	});

	planner.queueFiles({
		files: options.files,
		filter: (file) => file.metadata.kind === 'resource-controller',
	});
}

interface BuildResourcePlansOptions {
	readonly ir: IRv1;
	readonly storageState: ResourceStorageHelperState;
	readonly wpPostRoutesState: WpPostRouteHelperState;
	readonly reporter: BuilderApplyOptions['reporter'];
}

function buildResourcePlans(
	options: BuildResourcePlansOptions
): readonly RestControllerResourcePlan[] {
	return options.ir.resources.map((resource) =>
		buildResourcePlan({
			ir: options.ir,
			resource,
			storageState: options.storageState,
			wpPostRoutesState: options.wpPostRoutesState,
			reporter: options.reporter,
		})
	);
}

type ErrorCodeFactory = (suffix: string) => string;

interface ResourcePlanOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly storageState: ResourceStorageHelperState;
	readonly wpPostRoutesState: WpPostRouteHelperState;
	readonly reporter: BuilderApplyOptions['reporter'];
}

interface ControllerBuildContext {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: ErrorCodeFactory;
	readonly storageArtifacts: StorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly routeMetadataList: readonly ResourceControllerRouteMetadata[];
}

interface StorageArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly helperSignatures: readonly string[];
	readonly routeHandlers?: RestControllerRouteHandlers;
	readonly optionHandlers?: RestControllerRouteOptionHandlers;
	readonly transientHandlers?: RestControllerRouteTransientHandlers;
}

function buildResourcePlan(
	options: ResourcePlanOptions
): RestControllerResourcePlan {
	const { ir, resource, storageState, wpPostRoutesState } = options;
	const identity = resolveIdentityConfig(resource);
	const pascalName = toPascalCase(resource.name);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);

	const wpPostRouteBundle = readWpPostRouteBundle(
		wpPostRoutesState,
		resource.name
	);

	const storageArtifacts = buildStorageArtifacts({
		resource,
		storageState,
	});

	const routeDefinitions = resource.routes.map((route) => ({
		method: route.method,
		path: route.path,
	}));
	const canonicalBasePaths = collectCanonicalBasePaths(
		routeDefinitions,
		identity.param
	);
	const mutationMetadata =
		wpPostRouteBundle?.mutationMetadata ??
		resolveRouteMutationMetadata(resource);
	const routeMetadataList = buildResourceControllerRouteMetadata({
		routes: routeDefinitions,
		identity: { param: identity.param },
		canonicalBasePaths,
		cacheKeys: buildCacheKeyPlan(resource),
		mutationMetadata,
	});

	const helperMethods = [
		...storageArtifacts.helperMethods,
		...(wpPostRouteBundle?.helperMethods ?? []),
	];
	const helperSignatures = storageArtifacts.helperSignatures;

	return {
		name: resource.name,
		className: `${pascalName}Controller`,
		schemaKey: resource.schemaKey,
		schemaProvenance: resource.schemaProvenance,
		restArgsExpression: renderPhpValue(
			sanitizeJson(buildRestArgs(ir.schemas, resource))
		),
		identity,
		cacheKeys: resource.cacheKeys,
		mutationMetadata,
		helperMethods,
		helperSignatures,
		routes: buildRoutePlans({
			ir,
			resource,
			identity,
			pascalName,
			errorCodeFactory,
			storageArtifacts,
			wpPostRouteBundle,
			reporter: options.reporter,
			routeMetadataList,
		}),
	} satisfies RestControllerResourcePlan;
}

function buildRoutePlans(
	options: ControllerBuildContext
): readonly RestControllerRoutePlan[] {
	return options.resource.routes.map((route, index) => {
		const currentRouteMetadata = options.routeMetadataList[index];
		if (!currentRouteMetadata) {
			throw new Error(
				'Expected route metadata to be defined for resource route.'
			);
		}

		return buildRoutePlan({
			...options,
			route,
			currentRouteMetadata,
		});
	});
}

interface RoutePlanOptions extends ControllerBuildContext {
	readonly route: IRResource['routes'][number];
	readonly currentRouteMetadata: ResourceControllerRouteMetadata;
}

function buildRoutePlan(options: RoutePlanOptions): RestControllerRoutePlan {
	const { ir, route, currentRouteMetadata } = options;

	const fallbackAnalysis = analyseRouteSupport({
		resourceName: options.resource.name,
		storageMode: options.resource.storage?.mode,
		route,
		routeMetadata: currentRouteMetadata,
		storageArtifacts: options.storageArtifacts,
		wpPostRouteBundle: options.wpPostRouteBundle,
	});

	if (!fallbackAnalysis.supported) {
		const context = buildFallbackLogContext({
			resourceName: options.resource.name,
			route,
			routeMetadata: currentRouteMetadata,
			storageMode: options.resource.storage?.mode,
			reason: fallbackAnalysis.reason,
			hint: fallbackAnalysis.hint,
		});

		if (route.transport === 'remote') {
			options.reporter.info?.(
				'Route emitted Not Implemented stub.',
				context
			);
		} else {
			options.reporter.warn(
				'Route emitted Not Implemented stub.',
				context
			);
		}
	}

	const routeSetOptions: BuildResourceControllerRouteSetOptions = {
		plan: {
			definition: {
				method: route.method,
				path: route.path,
				capability: route.capability,
			},
			methodName: buildRouteMethodName(route, ir),
		},
		...buildRouteSetOptions({
			resource: options.resource,
			route: options.route,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			storageArtifacts: options.storageArtifacts,
			wpPostRouteBundle: options.wpPostRouteBundle,
		}),
		fallbackContext: {
			resource: options.resource.name,
			transport: route.transport,
			kind: currentRouteMetadata.kind,
			storageMode: options.resource.storage?.mode,
			reason: fallbackAnalysis.reason,
			hint: fallbackAnalysis.hint,
		},
	} as BuildResourceControllerRouteSetOptions;

	return buildResourceControllerRouteSet(routeSetOptions);
}

interface BuildStorageArtifactsOptions {
	readonly resource: IRResource;
	readonly storageState: ResourceStorageHelperState;
}

function buildStorageArtifacts(
	options: BuildStorageArtifactsOptions
): StorageArtifacts {
	const storageMode = options.resource.storage?.mode;

	switch (storageMode) {
		case 'wp-taxonomy':
			return buildTaxonomyStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		case 'transient':
			return buildTransientStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		case 'wp-option':
			return buildWpOptionStorageArtifactsFromState({
				state: options.storageState,
				resourceName: options.resource.name,
			});
		default:
			return {
				helperMethods: [],
				helperSignatures: [],
			} satisfies StorageArtifacts;
	}
}

interface ReadStorageArtifactsOptions {
	readonly state: ResourceStorageHelperState;
	readonly resourceName: string;
}

function buildTaxonomyStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.wpTaxonomy.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: artifacts?.helperSignatures ?? [],
		routeHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}

function buildTransientStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.transient.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: [],
		transientHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}

function buildWpOptionStorageArtifactsFromState(
	options: ReadStorageArtifactsOptions
): StorageArtifacts {
	const artifacts = options.state.wpOption.get(options.resourceName);

	return {
		helperMethods: artifacts?.helperMethods ?? [],
		helperSignatures: [],
		optionHandlers: artifacts?.routeHandlers,
	} satisfies StorageArtifacts;
}

function resolveRouteMutationMetadata(
	resource: IRResource
): { readonly channelTag: string } | undefined {
	if (resource.storage?.mode === 'wp-post') {
		return {
			channelTag: 'resource.wpPost.mutation',
		};
	}

	return undefined;
}

type ResourceStorageMode =
	NonNullable<IRResource['storage']> extends {
		mode: infer Mode;
	}
		? Mode
		: never;

function buildCacheKeyPlan(resource: Pick<IRResource, 'cacheKeys'>) {
	const { cacheKeys } = resource;

	return buildResourceCacheKeysPlan({
		list: { segments: cacheKeys.list.segments },
		get: { segments: cacheKeys.get.segments },
		...(cacheKeys.create
			? { create: { segments: cacheKeys.create.segments } }
			: {}),
		...(cacheKeys.update
			? { update: { segments: cacheKeys.update.segments } }
			: {}),
		...(cacheKeys.remove
			? { remove: { segments: cacheKeys.remove.segments } }
			: {}),
	});
}

interface RouteSupportAnalysisOptions {
	readonly resourceName: string;
	readonly storageMode: ResourceStorageMode | undefined;
	readonly route: IRResource['routes'][number];
	readonly routeMetadata: ResourceControllerRouteMetadata;
	readonly storageArtifacts: StorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
}

interface RouteSupportAnalysisResult {
	readonly supported: boolean;
	readonly reason?: string;
	readonly hint?: string;
}

function analyseRouteSupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	if (options.route.transport === 'remote') {
		return {
			supported: false,
			reason: 'Route transport is remote. CLI only generates local handlers.',
			hint: 'Implement the remote route manually or switch it to local transport with supported storage.',
		} satisfies RouteSupportAnalysisResult;
	}

	const storageMode = options.storageMode;
	if (!storageMode) {
		return {
			supported: false,
			reason: 'Resource has no storage configuration.',
			hint: `Add a storage mode to resources.${options.resourceName} or mark the route transport as "remote".`,
		} satisfies RouteSupportAnalysisResult;
	}

	switch (storageMode) {
		case 'wp-post':
			return analyseWpPostSupport(options);
		case 'wp-taxonomy':
			return analyseWpTaxonomySupport(options);
		case 'wp-option':
			return analyseWpOptionSupport(options);
		case 'transient':
			return analyseTransientSupport(options);
		default:
			return {
				supported: false,
				reason: `Storage mode "${storageMode}" is not supported by the PHP generator.`,
				hint: 'Use wp-post, wp-option, wp-taxonomy, or transient storage, or extend the pipeline with a custom helper.',
			} satisfies RouteSupportAnalysisResult;
	}
}

function analyseWpPostSupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	const handlers = options.wpPostRouteBundle?.routeHandlers;
	if (!handlers) {
		return {
			supported: false,
			reason: 'WP_Post storage helpers were not generated for this resource.',
			hint: 'Ensure the wp-post storage helper runs before the resource controller helper.',
		} satisfies RouteSupportAnalysisResult;
	}

	if (!resolveHandlerForKind(handlers, options.routeMetadata.kind)) {
		return {
			supported: false,
			reason: `wp-post storage does not implement "${options.routeMetadata.kind}" routes.`,
			hint: 'Supported route kinds are list, get, create, update, and remove.',
		} satisfies RouteSupportAnalysisResult;
	}

	return { supported: true } satisfies RouteSupportAnalysisResult;
}

function analyseWpTaxonomySupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	const handlers = options.storageArtifacts.routeHandlers;
	if (!handlers) {
		return {
			supported: false,
			reason: 'Taxonomy storage helpers were not generated for this resource.',
			hint: `Run the taxonomy storage helper before the controller helper and confirm resources.${options.resourceName} uses wp-taxonomy storage.`,
		} satisfies RouteSupportAnalysisResult;
	}

	if (!resolveHandlerForKind(handlers, options.routeMetadata.kind)) {
		return {
			supported: false,
			reason: `wp-taxonomy storage does not implement "${options.routeMetadata.kind}" routes.`,
			hint: 'Taxonomy controllers support list and get operations. Remove unsupported routes or change storage modes.',
		} satisfies RouteSupportAnalysisResult;
	}

	return { supported: true } satisfies RouteSupportAnalysisResult;
}

function analyseWpOptionSupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	const handlers = options.storageArtifacts.optionHandlers;
	if (!handlers) {
		return {
			supported: false,
			reason: 'WP option storage helpers were not generated for this resource.',
			hint: `Ensure resources.${options.resourceName}.storage.option is configured before running the controller helper.`,
		} satisfies RouteSupportAnalysisResult;
	}

	if (!handlers.get && options.route.method.toUpperCase() === 'GET') {
		return {
			supported: false,
			reason: 'wp-option storage helper is missing the GET handler.',
			hint: 'Re-run the CLI with a valid option storage configuration.',
		} satisfies RouteSupportAnalysisResult;
	}

	if (isWriteRoute(options.route.method)) {
		if (!handlers.update) {
			return {
				supported: false,
				reason: 'wp-option storage helper is missing the update handler.',
				hint: 'Re-run the CLI with a valid option storage configuration.',
			} satisfies RouteSupportAnalysisResult;
		}

		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	if (handlers.unsupported) {
		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	return {
		supported: false,
		reason: `wp-option storage does not implement "${options.route.method.toUpperCase()}" operations.`,
		hint: 'Option controllers only support GET and write (POST/PUT/PATCH) operations.',
	} satisfies RouteSupportAnalysisResult;
}

function analyseTransientSupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	const handlers = options.storageArtifacts.transientHandlers;
	if (!handlers) {
		return {
			supported: false,
			reason: 'Transient storage helpers were not generated for this resource.',
			hint: `Ensure resources.${options.resourceName}.storage.mode is set to "transient" and rerun the CLI.`,
		} satisfies RouteSupportAnalysisResult;
	}

	if (options.route.method.toUpperCase() === 'GET') {
		if (!handlers.get) {
			return {
				supported: false,
				reason: 'transient storage helper is missing the GET handler.',
				hint: 'Re-run the CLI with a valid transient storage configuration.',
			} satisfies RouteSupportAnalysisResult;
		}

		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	if (isWriteRoute(options.route.method)) {
		if (!handlers.set) {
			return {
				supported: false,
				reason: 'transient storage helper is missing the write handler.',
				hint: 'Re-run the CLI with a valid transient storage configuration.',
			} satisfies RouteSupportAnalysisResult;
		}

		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	if (options.route.method.toUpperCase() === 'DELETE') {
		if (!handlers.delete) {
			return {
				supported: false,
				reason: 'transient storage helper is missing the delete handler.',
				hint: 'Re-run the CLI with a valid transient storage configuration.',
			} satisfies RouteSupportAnalysisResult;
		}

		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	if (handlers.unsupported) {
		return { supported: true } satisfies RouteSupportAnalysisResult;
	}

	return {
		supported: false,
		reason: `transient storage does not implement "${options.route.method.toUpperCase()}" operations.`,
		hint: 'Transient controllers only support GET, write (POST/PUT/PATCH), and DELETE operations.',
	} satisfies RouteSupportAnalysisResult;
}

const ROUTE_KIND_TO_HANDLER: Record<
	ResourceControllerRouteMetadata['kind'],
	keyof RestControllerRouteHandlers | undefined
> = {
	list: 'list',
	get: 'get',
	create: 'create',
	update: 'update',
	remove: 'remove',
	custom: 'custom',
};

function resolveHandlerForKind(
	handlers: RestControllerRouteHandlers | undefined,
	kind: ResourceControllerRouteMetadata['kind']
) {
	if (!handlers) {
		return undefined;
	}

	const key = ROUTE_KIND_TO_HANDLER[kind];
	return key ? handlers[key] : undefined;
}

interface BuildFallbackLogContextOptions {
	readonly resourceName: string;
	readonly route: IRResource['routes'][number];
	readonly routeMetadata: ResourceControllerRouteMetadata;
	readonly storageMode: ResourceStorageMode | undefined;
	readonly reason?: string;
	readonly hint?: string;
}

function buildFallbackLogContext(
	options: BuildFallbackLogContextOptions
): Record<string, unknown> {
	const context: Record<string, unknown> = {
		resource: options.resourceName,
		method: options.route.method,
		path: options.route.path,
		kind: options.routeMetadata.kind,
		transport: options.route.transport,
	};

	if (options.storageMode) {
		context.storageMode = options.storageMode;
	}

	if (options.reason) {
		context.reason = options.reason;
	}

	if (options.hint) {
		context.hint = options.hint;
	}

	return context;
}
