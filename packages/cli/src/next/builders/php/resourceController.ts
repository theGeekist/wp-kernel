import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../runtime/types';
import {
	buildProgramTargetPlanner,
	buildResourceControllerRouteSet,
	buildRestControllerModuleFromPlan,
	type WpPostRouteBundle,
	DEFAULT_DOC_HEADER,
	type RestControllerResourcePlan,
	type RestControllerRoutePlan,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRouteTransientHandlers,
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
import { renderPhpValue } from './resource/phpValue';
import { createPhpWpPostRoutesHelper } from './resource';
import {
	getResourceStorageHelperState,
	type ResourceStorageHelperState,
} from './resource/storageHelpers';

export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.controller.resources.storage.transient',
			'builder.generate.php.controller.resources.storage.wpOption',
			'builder.generate.php.controller.resources.storage.wpTaxonomy',
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

			const moduleResult = buildRestControllerModuleFromPlan({
				origin: ir.meta.origin,
				pluginNamespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				capabilityClass: `${ir.php.namespace}\\Generated\\Capability\\Capability`,
				resources: buildResourcePlans(ir, storageState),
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

function buildResourcePlans(
	ir: IRv1,
	storageState: ResourceStorageHelperState
): readonly RestControllerResourcePlan[] {
	return ir.resources.map((resource) =>
		buildResourcePlan({ ir, resource, storageState })
	);
}

type ErrorCodeFactory = (suffix: string) => string;

interface ResourcePlanOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly storageState: ResourceStorageHelperState;
}

interface ControllerBuildContext {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: ErrorCodeFactory;
	readonly storageArtifacts: StorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
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
	const { ir, resource, storageState } = options;
	const identity = resolveIdentityConfig(resource);
	const pascalName = toPascalCase(resource.name);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);

	const wpPostRouteBundle = createPhpWpPostRoutesHelper({
		resource,
		pascalName,
		identity,
		errorCodeFactory,
	});

	const storageArtifacts = buildStorageArtifacts({
		resource,
		storageState,
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
		mutationMetadata:
			wpPostRouteBundle?.mutationMetadata ??
			resolveRouteMutationMetadata(resource),
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
		}),
	} satisfies RestControllerResourcePlan;
}

function buildRoutePlans(
	options: ControllerBuildContext
): readonly RestControllerRoutePlan[] {
	return options.resource.routes.map((route) =>
		buildRoutePlan({
			...options,
			route,
		})
	);
}

interface RoutePlanOptions extends ControllerBuildContext {
	readonly route: IRResource['routes'][number];
}

function buildRoutePlan(options: RoutePlanOptions): RestControllerRoutePlan {
	const { ir, route } = options;

	return buildResourceControllerRouteSet({
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
	});
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
