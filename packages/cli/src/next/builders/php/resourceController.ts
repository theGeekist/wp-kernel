import { createHelper } from '@wpkernel/core/pipeline';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendClassTemplate,
	appendGeneratedFileDocblock,
	buildArg,
	buildAssign,
	assembleClassTemplate,
	makeErrorCodeFactory,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildArray,
	buildMethodCall,
	assembleMethodTemplate,
	buildName,
	buildNode,
	createPhpFileBuilder,
	buildPhpReturnPrintable,
	buildPrintable,
	buildReturn,
	buildScalarString,
	buildStaticCall,
	buildVariable,
	escapeSingleQuotes,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_INDENT,
	PHP_METHOD_MODIFIER_PUBLIC,
	toPascalCase,
	type PhpAstBuilderAdapter,
	type PhpMethodTemplate,
	type PhpStmtIf,
	type ResourceControllerRouteMetadata,
	type ResourceMetadataHost,
} from '@wpkernel/php-json-ast';
import type { IRResource, IRRoute, IRv1 } from '../../../ir/types';
import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import { collectCanonicalBasePaths } from './routes';
import { buildRestArgs } from './resourceController/restArgs';
import {
	createRouteMetadata,
	type RouteMetadataKind,
} from './resourceController/metadata';
import { createRouteMethodName } from './resourceController/routeNaming';
import { routeUsesIdentity } from './resourceController/routeIdentity';
import { appendNotImplementedStub } from './resourceController/stubs';
import { handleRouteKind } from './resourceController/routes/handleRouteKind';
import { createWpTaxonomyHelperMethods } from './resource/wpTaxonomy';
import { formatStatementPrintable } from './resource/printer';

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
	const routeMetadata = createRouteMetadata({
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

	const methods: PhpMethodTemplate[] = [];

	methods.push(
		assembleMethodTemplate({
			signature: 'public function get_resource_name(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const returnPrintable = formatStatementPrintable(
					buildReturn(buildScalarString(resource.name)),
					{
						indentLevel: 2,
						indentUnit: PHP_INDENT,
					}
				);
				body.statement(returnPrintable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: buildIdentifier('string'),
			},
		})
	);

	methods.push(
		assembleMethodTemplate({
			signature: 'public function get_schema_key(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const returnPrintable = formatStatementPrintable(
					buildReturn(buildScalarString(resource.schemaKey)),
					{
						indentLevel: 2,
						indentUnit: PHP_INDENT,
					}
				);
				body.statement(returnPrintable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: buildIdentifier('string'),
			},
		})
	);

	methods.push(
		assembleMethodTemplate({
			signature: 'public function get_rest_args(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const payload = buildRestArgs(ir.schemas, resource);
				if (Object.keys(payload).length === 0) {
					const returnPrintable = formatStatementPrintable(
						buildReturn(buildArray([])),
						{
							indentLevel: 2,
							indentUnit: PHP_INDENT,
						}
					);
					body.statement(returnPrintable);
					return;
				}

				const printable = buildPhpReturnPrintable(payload, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: buildIdentifier('array'),
			},
		})
	);

	const routeMethods = resource.routes.map((route: IRRoute, index) =>
		createRouteMethodTemplate({
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

	if (resource.storage?.mode === 'wp-taxonomy') {
		const taxonomyHelpers = createWpTaxonomyHelperMethods({
			resource,
			pascalName,
			identity,
			errorCodeFactory,
		});
		methods.push(...taxonomyHelpers);
	}

	const classTemplate = assembleClassTemplate({
		name: className,
		flags: PHP_CLASS_MODIFIER_FINAL,
		extends: 'BaseController',
		methods,
	});

	appendClassTemplate(builder, classTemplate);

	builder.setMetadata({
		kind: 'resource-controller',
		name: resource.name,
		identity,
		routes: routeMetadata,
	});
}

interface RouteTemplateOptions {
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

function createRouteMethodTemplate(
	options: RouteTemplateOptions
): PhpMethodTemplate {
	const methodName = createRouteMethodName(options.route, options.ir);
	const indentLevel = 1;
	const docblock = [
		`Handle [${options.route.method}] ${options.route.path}.`,
		`@wp-kernel route-kind ${options.routeKind}`,
		...createRouteTagDocblock(options.routeMetadata?.tags),
	];

	return assembleMethodTemplate({
		signature: `public function ${methodName}( WP_REST_Request $request )`,
		indentLevel,
		indentUnit: PHP_INDENT,
		docblock,
		body: (body) => {
			const indent = PHP_INDENT.repeat(indentLevel + 1);

			if (
				routeUsesIdentity({
					route: options.route,
					routeKind: options.routeKind,
					identity: options.identity,
				})
			) {
				const param = options.identity.param;
				const assign = buildAssign(
					buildVariable(param),
					buildMethodCall(
						buildVariable('request'),
						buildIdentifier('get_param'),
						[buildArg(buildScalarString(param))]
					)
				);
				const assignPrintable = buildPrintable(
					buildExpressionStatement(assign),
					[
						`${indent}$${param} = $request->get_param( '${escapeSingleQuotes(
							param
						)}' );`,
					]
				);
				body.statement(assignPrintable);
				body.blank();
			}

			if (options.route.policy) {
				const policyAssign = buildAssign(
					buildVariable('permission'),
					buildStaticCall(
						buildName(['Policy']),
						buildIdentifier('enforce'),
						[
							buildArg(buildScalarString(options.route.policy)),
							buildArg(buildVariable('request')),
						]
					)
				);
				const assignPrintable = buildPrintable(
					buildExpressionStatement(policyAssign),
					[
						`${indent}$permission = Policy::enforce( '${escapeSingleQuotes(
							options.route.policy
						)}', $request );`,
					]
				);
				body.statement(assignPrintable);

				const isErrorCall = buildFuncCall(buildName(['is_wp_error']), [
					buildArg(buildVariable('permission')),
				]);
				const ifNode = buildNode<PhpStmtIf>('Stmt_If', {
					cond: isErrorCall,
					stmts: [buildReturn(buildVariable('permission'))],
					elseifs: [],
					else: null,
				});
				const ifPrintable = buildPrintable(ifNode, [
					`${indent}if ( is_wp_error( $permission ) ) {`,
					`${indent}${PHP_INDENT}return $permission;`,
					`${indent}}`,
				]);
				body.statement(ifPrintable);
				body.blank();
			}

			const handled = handleRouteKind({
				body,
				indentLevel: indentLevel + 1,
				resource: options.resource,
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

			if (handled) {
				return;
			}

			appendNotImplementedStub({
				body,
				indent,
				route: options.route,
			});
		},
	});
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

function createRouteTagDocblock(
	tags: ResourceControllerRouteMetadata['tags'] | undefined
): string[] {
	if (!tags) {
		return [];
	}

	return Object.entries(tags)
		.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
		.map(([key, value]) => `@wp-kernel ${key} ${value}`);
}
