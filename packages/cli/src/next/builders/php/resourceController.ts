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
	buildWpOptionStorageArtifacts,
	buildTransientStorageArtifacts,
	buildWpPostRouteBundle,
	type WpPostRouteBundle,
	resolveTransientKey,
	DEFAULT_DOC_HEADER,
	type RestControllerResourcePlan,
	type RestControllerRoutePlan,
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
import {
	buildWpTaxonomyHelperArtifacts,
	ensureWpTaxonomyStorage,
} from './resource/wpTaxonomy';
import { renderPhpValue } from './resource/phpValue';
import { ensureWpOptionStorage } from './resource/wpOption/shared';

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

			const moduleResult = buildRestControllerModuleFromPlan({
				origin: ir.meta.origin,
				pluginNamespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				capabilityClass: `${ir.php.namespace}\\Generated\\Capability\\Capability`,
				resources: buildResourcePlans(ir),
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

function buildResourcePlans(ir: IRv1): readonly RestControllerResourcePlan[] {
	return ir.resources.map((resource) => buildResourcePlan({ ir, resource }));
}

type ErrorCodeFactory = (suffix: string) => string;

interface ResourcePlanOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
}

interface ControllerBuildContext {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: ErrorCodeFactory;
	readonly transientArtifacts?: ReturnType<
		typeof buildTransientStorageArtifacts
	>;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
}

interface StorageHelperArtifacts {
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly helperSignatures: readonly string[];
}

function buildResourcePlan(
	options: ResourcePlanOptions
): RestControllerResourcePlan {
	const { ir, resource } = options;
	const identity = resolveIdentityConfig(resource);
	const pascalName = toPascalCase(resource.name);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);

	const transientArtifacts =
		resource.storage?.mode === 'transient'
			? buildTransientStorageArtifacts({
					pascalName,
					key: resolveTransientKey({
						resourceName: resource.name,
						namespace:
							ir.meta.sanitizedNamespace ??
							ir.meta.namespace ??
							'',
					}),
					identity,
					cacheSegments: resource.cacheKeys.get.segments,
					errorCodeFactory,
				})
			: undefined;

	// Keep wp-post route bundle so CLI can still rely on the post-specific bundle surface.
	const wpPostRouteBundle =
		resource.storage?.mode === 'wp-post'
			? buildWpPostRouteBundle({
					resource,
					pascalName,
					identity,
					errorCodeFactory,
				})
			: undefined;

	// Build helper artifacts (taxonomy / transient / option) and include any wp-post helpers.
	const helperArtifacts = buildStorageHelperArtifacts({
		ir,
		resource,
		identity,
		pascalName,
		errorCodeFactory,
		transientArtifacts,
		wpPostRouteBundle,
	});

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
		mutationMetadata: wpPostRouteBundle?.mutationMetadata,
		helperMethods: helperArtifacts.helperMethods,
		helperSignatures: helperArtifacts.helperSignatures,
		routes: buildRoutePlans({
			ir,
			resource,
			identity,
			pascalName,
			errorCodeFactory,
			transientArtifacts,
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
			transientArtifacts: options.transientArtifacts,
			wpPostRouteBundle: options.wpPostRouteBundle,
		}),
	});
}

function buildStorageHelperArtifacts(
	options: ControllerBuildContext
): StorageHelperArtifacts {
	const storageMode = options.resource.storage?.mode;

	// Start with empty accumulators
	const accumulatedMethods: PhpStmtClassMethod[] = [];
	const accumulatedSignatures: string[] = [];

	switch (storageMode) {
		case 'wp-taxonomy': {
			const storage = ensureWpTaxonomyStorage(options.resource.storage, {
				resourceName: options.resource.name,
			});

			const taxonomyArtifacts = buildWpTaxonomyHelperArtifacts({
				pascalName: options.pascalName,
				storage,
				identity: options.identity,
				errorCodeFactory: options.errorCodeFactory,
			});

			accumulatedMethods.push(...taxonomyArtifacts.helperMethods);
			accumulatedSignatures.push(...taxonomyArtifacts.helperSignatures);

			break;
		}
		case 'transient': {
			accumulatedMethods.push(...(options.transientArtifacts?.helperMethods ?? []));
			// No signatures for transient artifacts currently
			break;
		}
		case 'wp-option': {
			const storage = ensureWpOptionStorage(options.resource);

			const artifacts = buildWpOptionStorageArtifacts({
				pascalName: options.pascalName,
				optionName: storage.option,
				errorCodeFactory: options.errorCodeFactory,
			});

			accumulatedMethods.push(...artifacts.helperMethods);
			// artifacts currently don't expose signatures; keep signatures empty for now
			break;
		}
		// No default
	}

	// If the wp-post bundle exists, append its helper methods (no signatures expected from bundle).
	if (options.wpPostRouteBundle) {
		accumulatedMethods.push(...options.wpPostRouteBundle.helperMethods);
	}

	return {
		helperMethods: accumulatedMethods,
		helperSignatures: accumulatedSignatures,
	} satisfies StorageHelperArtifacts;
}