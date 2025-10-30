import type {
	PhpExpr,
	PhpStmt,
	PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import type {
	ResourceCacheKeysSource,
	RouteMutationMetadataPlan,
} from '../common/metadata/resourceController';
import {
	buildResourceCacheKeysPlan,
	buildResourceControllerMetadata,
	routeUsesIdentity,
} from '../common/metadata/resourceController';
import type { ResourceMetadataHost } from '../common/metadata/cache';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../types';
import { buildRestControllerModule } from './module';
import type {
	RestControllerIdentity,
	RestControllerModuleControllerConfig,
	RestControllerModuleIndexEntry,
	RestControllerModuleResult,
	RestRouteConfig,
} from './types';

/**
 * Describes an HTTP route exposed by a generated REST controller.
 *
 * The CLI reduces its IR to these plans so `wp-json-ast` can take over the
 * heavy lifting of docblocks, metadata, and identity plumbing while allowing
 * callers to focus on the statements that implement the route behaviour.
 */
export interface RestControllerRouteDefinition {
	readonly method: string;
	readonly path: string;
	readonly capability?: string;
}

/**
 * Context passed to route statement builders. The metadata host allows a plan
 * to append cache events or tweak route annotations as statements are emitted.
 */
export interface RestControllerRouteStatementsContext {
	readonly metadata: ResourceControllerRouteMetadata;
	readonly metadataHost: ResourceMetadataHost;
}

type BuildRestControllerRouteStatements = (
	context: RestControllerRouteStatementsContext
) => readonly PhpStmt[] | null | undefined;

type BuildRestControllerRouteFallbackStatements = () => readonly PhpStmt[];

/**
 * Declarative description of a REST controller route. Each plan is responsible
 * for generating the statements that populate the controller method. Metadata
 * updates happen through the supplied context so the planner can track cache
 * hints and annotations consistently across routes.
 */
export interface RestControllerRoutePlan {
	readonly definition: RestControllerRouteDefinition;
	readonly methodName: string;
	readonly docblockSummary?: string;
	readonly buildStatements: BuildRestControllerRouteStatements;
	readonly buildFallbackStatements?: BuildRestControllerRouteFallbackStatements;
}

/**
 * High-level configuration for a generated REST controller class. Plans mirror
 * the CLI IR but avoid any direct AST work so the pipeline can remain readable
 * and accessible to developers adding new resources or routes.
 */
export interface RestControllerResourcePlan {
	readonly name: string;
	readonly className: string;
	readonly schemaKey: string;
	readonly schemaProvenance: string;
	readonly restArgsExpression: PhpExpr;
	readonly identity: RestControllerIdentity;
	readonly cacheKeys: ResourceCacheKeysSource;
	readonly mutationMetadata?: RouteMutationMetadataPlan;
	readonly helperMethods?: readonly PhpStmtClassMethod[];
	readonly routes: readonly RestControllerRoutePlan[];
}

/**
 * Options accepted by `buildRestControllerModuleFromPlan`. Callers supply the
 * surrounding namespace information alongside the resource plans so the planner
 * can enqueue controller programs and an index file in a single call.
 */
export interface BuildRestControllerModuleFromPlanOptions {
	readonly origin: string;
	readonly pluginNamespace: string;
	readonly sanitizedNamespace: string;
	readonly capabilityClass: string;
	readonly resources: readonly RestControllerResourcePlan[];
	readonly includeBaseController?: boolean;
	readonly baseControllerFileName?: string;
	readonly additionalIndexEntries?: readonly RestControllerModuleIndexEntry[];
}

/**
 * Generates REST controller programs from declarative resource plans. The
 * returned module mirrors the existing controller surface (individual class
 * files plus `index.php`) while keeping implementation details inside the
 * `wp-json-ast` pipeline.
 * @param options
 */
export function buildRestControllerModuleFromPlan(
	options: BuildRestControllerModuleFromPlanOptions
): RestControllerModuleResult {
	const namespaceRoot = `${options.pluginNamespace}\\Generated`;
	const namespace = `${namespaceRoot}\\Rest`;

	const controllers = options.resources.map((resource) =>
		buildControllerConfig({
			resource,
			capabilityClass: options.capabilityClass,
		})
	);

	return buildRestControllerModule({
		origin: options.origin,
		sanitizedNamespace: options.sanitizedNamespace,
		namespace,
		controllers,
		includeBaseController: options.includeBaseController,
		baseControllerFileName: options.baseControllerFileName,
		additionalIndexEntries: options.additionalIndexEntries,
	});
}

interface BuildControllerConfigOptions {
	readonly resource: RestControllerResourcePlan;
	readonly capabilityClass: string;
}

function buildControllerConfig(
	options: BuildControllerConfigOptions
): RestControllerModuleControllerConfig {
	const metadataEnvironment = createControllerMetadataEnvironment(
		buildResourceControllerMetadata({
			name: options.resource.name,
			identity: options.resource.identity,
			routes: options.resource.routes.map((route) => route.definition),
			cacheKeys: buildResourceCacheKeysPlan(options.resource.cacheKeys),
			mutationMetadata: options.resource.mutationMetadata,
		})
	);

	const routes = options.resource.routes.map((plan, index) =>
		buildRouteConfig({
			plan,
			index,
			metadata: metadataEnvironment,
			identity: options.resource.identity,
		})
	);

	return {
		className: options.resource.className,
		resourceName: options.resource.name,
		schemaKey: options.resource.schemaKey,
		schemaProvenance: options.resource.schemaProvenance,
		restArgsExpression: options.resource.restArgsExpression,
		identity: options.resource.identity,
		routes,
		helperMethods: options.resource.helperMethods,
		capabilityClass: options.capabilityClass,
		fileName: `Rest/${options.resource.className}.php`,
		metadata: metadataEnvironment.snapshot(),
	} satisfies RestControllerModuleControllerConfig;
}

interface ControllerMetadataEnvironment {
	readonly host: ResourceMetadataHost;
	readonly snapshot: () => ResourceControllerMetadata;
}

/**
 * Maintains controller metadata while routes mutate it via the shared host.
 * Consumers call `snapshot()` after planning routes to capture the final state
 * for inclusion in the generated controller file metadata.
 * @param initial
 */
function createControllerMetadataEnvironment(
	initial: ResourceControllerMetadata
): ControllerMetadataEnvironment {
	let state = initial;

	return {
		host: {
			getMetadata: () => state,
			setMetadata: (metadata) => {
				if (metadata.kind === 'resource-controller') {
					state = metadata;
				}
			},
		},
		snapshot: () => state,
	} satisfies ControllerMetadataEnvironment;
}

interface BuildRouteConfigOptions {
	readonly plan: RestControllerRoutePlan;
	readonly index: number;
	readonly metadata: ControllerMetadataEnvironment;
	readonly identity: RestControllerIdentity;
}

function buildRouteConfig(options: BuildRouteConfigOptions): RestRouteConfig {
	const controllerMetadata = options.metadata.snapshot();
	const initialMetadata =
		controllerMetadata.routes[options.index] ??
		buildFallbackRouteMetadata(options.plan.definition);

	const statements = resolveRouteStatements({
		plan: options.plan,
		metadata: initialMetadata,
		metadataHost: options.metadata.host,
	});

	const metadataAfter = options.metadata.snapshot();
	const finalMetadata =
		metadataAfter.routes[options.index] ?? initialMetadata;

	const usesIdentity = routeUsesIdentity({
		route: options.plan.definition,
		routeKind: finalMetadata.kind,
		identity: { param: options.identity.param },
	});

	return {
		methodName: options.plan.methodName,
		metadata: finalMetadata,
		capability: options.plan.definition.capability,
		docblockSummary: options.plan.docblockSummary,
		usesIdentity,
		statements,
	} satisfies RestRouteConfig;
}

interface ResolveRouteStatementsOptions {
	readonly plan: RestControllerRoutePlan;
	readonly metadata: ResourceControllerRouteMetadata;
	readonly metadataHost: ResourceMetadataHost;
}

/**
 * Resolves the statements for a route, falling back to the optional stub when
 * the plan opts out of providing custom logic.
 * @param options
 */
function resolveRouteStatements(
	options: ResolveRouteStatementsOptions
): readonly PhpStmt[] {
	const statements =
		options.plan.buildStatements({
			metadata: options.metadata,
			metadataHost: options.metadataHost,
		}) ?? [];

	if (statements.length > 0) {
		return statements;
	}

	return options.plan.buildFallbackStatements?.() ?? [];
}

function buildFallbackRouteMetadata(
	definition: RestControllerRouteDefinition
): ResourceControllerRouteMetadata {
	return {
		method: definition.method,
		path: definition.path,
		kind: 'custom',
	} satisfies ResourceControllerRouteMetadata;
}
