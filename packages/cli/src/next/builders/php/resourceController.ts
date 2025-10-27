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
	buildArg,
	buildAssign,
	buildClass,
	buildClassMethod,
	buildDocComment,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildParam,
	buildReturn,
	buildScalarString,
	buildStaticCall,
	buildStmtNop,
	buildVariable,
	createPhpFileBuilder,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpAstBuilderAdapter,
	type PhpAttributes,
	type PhpStmt,
	type PhpStmtClassMethod,
	type ResourceControllerRouteMetadata,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import { makeErrorCodeFactory, sanitizeJson, toPascalCase } from './utils';
import type { IRResource, IRRoute, IRv1 } from '../../../ir/types';
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
import { buildRequestParamAssignmentStatement } from './resource/request';
import { buildReturnIfWpError } from './resource/errors';

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
				const namespaceRoot = ir.php.namespace;
				const namespace = `${namespaceRoot}\\Rest`;
				const className = `${toPascalCase(resource.name)}Controller`;
				const filePath = options.context.workspace.resolve(
					ir.php.outputDir,
					'Rest',
					`${className}.php`
				);
				const identity = resolveIdentityConfig(resource);

				const helper = createPhpFileBuilder<
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
		getMetadata: () => builder.getMetadata(),
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
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → resources.${resource.name}`,
		`Schema: ${resource.schemaKey} (${resource.schemaProvenance})`,
		...resource.routes.map(
			(route: IRRoute) => `Route: [${route.method}] ${route.path}`
		),
	]);

	builder.addUse(`${ir.php.namespace}\\Policy\\Policy`);
	builder.addUse('WP_Error');
	builder.addUse('WP_REST_Request');
	builder.addUse('function is_wp_error');

	if (resource.storage?.mode === 'wp-post') {
		builder.addUse('WP_Post');
		builder.addUse('WP_Query');
	}

	if (resource.storage?.mode === 'wp-taxonomy') {
		builder.addUse('WP_Term');
		builder.addUse('WP_Term_Query');
	}

	const methods: PhpStmtClassMethod[] = [];

	methods.push(buildGetResourceNameMethod(resource));
	methods.push(buildGetSchemaKeyMethod(resource));
	methods.push(buildGetRestArgsMethod(ir, resource));

	const routeMethods = resource.routes.map((route: IRRoute, index) =>
		buildRouteMethod({
			builder,
			ir,
			resource,
			route,
			identity,
			pascalName,
			errorCodeFactory,
			metadataHost,
			routeKind: routeMetadata[index]?.kind ?? 'custom',
			routeMetadata: routeMetadata[index],
		})
	);

	methods.push(...routeMethods);

	appendStorageHelperMethods({
		resource,
		pascalName,
		identity,
		errorCodeFactory,
		ir,
		methods,
	});

	const classNode = buildClass(buildIdentifier(className), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		extends: buildName(['BaseController']),
		stmts: methods,
	});

	builder.appendProgramStatement(classNode);

	builder.setMetadata({
		kind: 'resource-controller',
		name: resource.name,
		identity,
		routes: routeMetadata,
	});
}

interface AppendStorageHelperMethodsOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly ir: IRv1;
	readonly methods: PhpStmtClassMethod[];
}

function appendStorageHelperMethods(
	options: AppendStorageHelperMethodsOptions
): void {
	const storageMode = options.resource.storage?.mode;

	if (storageMode === 'wp-taxonomy') {
		const taxonomyHelpers = buildWpTaxonomyHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
			identity: options.identity,
			errorCodeFactory: options.errorCodeFactory,
		});
		options.methods.push(...taxonomyHelpers.map((method) => method.node));
		return;
	}

	if (storageMode === 'transient') {
		const namespace =
			options.ir.meta.sanitizedNamespace ??
			options.ir.meta.namespace ??
			'';
		const transientHelpers = buildTransientHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
			namespace,
		});
		options.methods.push(...transientHelpers);
		return;
	}

	if (storageMode === 'wp-option') {
		const optionHelpers = buildWpOptionHelperMethods({
			resource: options.resource,
			pascalName: options.pascalName,
		});
		options.methods.push(...optionHelpers);
	}
}

function buildGetResourceNameMethod(resource: IRResource): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_resource_name'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturn(buildScalarString(resource.name))],
	});
}

function buildGetSchemaKeyMethod(resource: IRResource): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_schema_key'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturn(buildScalarString(resource.schemaKey))],
	});
}

function buildGetRestArgsMethod(
	ir: IRv1,
	resource: IRResource
): PhpStmtClassMethod {
	const payload = sanitizeJson(buildRestArgs(ir.schemas, resource));
	const expression = renderPhpValue(payload);

	return buildClassMethod(buildIdentifier('get_rest_args'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(expression)],
	});
}

interface RouteMethodOptions {
	readonly builder: PhpAstBuilderAdapter;
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly pascalName: string;
	readonly errorCodeFactory: (suffix: string) => string;
	readonly metadataHost: ResourceMetadataHost;
	readonly routeKind: RouteMetadataKind;
	readonly routeMetadata?: ResourceControllerRouteMetadata;
}

function buildRouteMethod(options: RouteMethodOptions): PhpStmtClassMethod {
	const methodName = buildRouteMethodName(options.route, options.ir);
	const docblock = [
		`Handle [${options.route.method}] ${options.route.path}.`,
		`@wp-kernel route-kind ${options.routeKind}`,
		...buildRouteTagDocblock(options.routeMetadata?.tags),
	];

	const statements: PhpStmt[] = [];

	if (
		routeUsesIdentity({
			route: options.route,
			routeKind: options.routeKind,
			identity: options.identity,
		})
	) {
		const param = options.identity.param;
		statements.push(
			buildRequestParamAssignmentStatement({
				requestVariable: 'request',
				param,
				targetVariable: param,
			})
		);
		statements.push(buildStmtNop());
	}

	if (options.route.policy) {
		const policyAssign = buildAssign(
			buildVariable('permission'),
			buildStaticCall(buildName(['Policy']), buildIdentifier('enforce'), [
				buildArg(buildScalarString(options.route.policy)),
				buildArg(buildVariable('request')),
			])
		);
		statements.push(buildExpressionStatement(policyAssign));

		statements.push(buildReturnIfWpError(buildVariable('permission')));
		statements.push(buildStmtNop());
	}

	const handledStatements = buildRouteKindStatements({
		resource: options.resource,
		route: options.route,
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
		metadataHost: options.metadataHost,
		cacheSegments: resolveCacheSegments(
			options.routeKind,
			options.resource,
			options.routeMetadata
		),
		routeKind: options.routeKind,
	});

	if (handledStatements && handledStatements.length > 0) {
		statements.push(...handledStatements);
	} else {
		statements.push(...buildNotImplementedStatements(options.route));
	}

	const attributes = buildDocAttributes(docblock);

	return buildClassMethod(
		buildIdentifier(methodName),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			params: [
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			stmts: statements,
		},
		attributes
	);
}

function buildDocAttributes(
	docblock: readonly string[]
): PhpAttributes | undefined {
	if (docblock.length === 0) {
		return undefined;
	}

	return { comments: [buildDocComment(docblock)] };
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

function buildRouteTagDocblock(
	tags: ResourceControllerRouteMetadata['tags'] | undefined
): string[] {
	if (!tags) {
		return [];
	}

	return Object.entries(tags)
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, value]) => `@wp-kernel ${key} ${value}`);
}
