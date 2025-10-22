import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { createPhpFileBuilder } from '../ast/programBuilder';
import type { PhpAstBuilderAdapter } from '../ast/programBuilder';
import { appendGeneratedFileDocblock } from '../ast/docblocks';
import { appendClassTemplate } from '../ast/append';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
	type PhpMethodTemplate,
} from '../ast/templates';
import {
	createIdentifier,
	createName,
	createReturn,
	createScalarString,
	createStaticCall,
	createAssign,
	createExpressionStatement,
	createVariable,
	createFuncCall,
	createMethodCall,
	createArg,
	createNode,
	type PhpStmtIf,
} from '../ast/nodes';
import { createPrintable } from '../ast/printables';
import {
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '../ast/modifiers';
import { createPhpReturn } from '../ast/valueRenderers';
import {
	createErrorCodeFactory,
	escapeSingleQuotes,
	toPascalCase,
} from '../ast/utils';
import type { IRResource, IRRoute, IRv1 } from '../../../../ir/types';
import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import { collectCanonicalBasePaths } from './routes';
import type { ResourceMetadataHost } from '../ast/factories/cacheMetadata';
import type { ResourceControllerRouteMetadata } from '../ast/types';
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

export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		async apply(options, next) {
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

				const helper = createPhpFileBuilder({
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
	const errorCodeFactory = createErrorCodeFactory(resource.name);
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
		createMethodTemplate({
			signature: 'public function get_resource_name(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(`return '${escapeSingleQuotes(resource.name)}';`);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: createIdentifier('string'),
			},
		})
	);

	methods.push(
		createMethodTemplate({
			signature: 'public function get_schema_key(): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					`return '${escapeSingleQuotes(resource.schemaKey)}';`
				);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: createIdentifier('string'),
			},
		})
	);

	methods.push(
		createMethodTemplate({
			signature: 'public function get_rest_args(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const payload = buildRestArgs(ir.schemas, resource);
				if (Object.keys(payload).length === 0) {
					body.line('return [];');
					return;
				}

				const printable = createPhpReturn(payload, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC,
				returnType: createIdentifier('array'),
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

	const classTemplate = createClassTemplate({
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

	return createMethodTemplate({
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
				const assign = createAssign(
					createVariable(param),
					createMethodCall(
						createVariable('request'),
						createIdentifier('get_param'),
						[createArg(createScalarString(param))]
					)
				);
				const assignPrintable = createPrintable(
					createExpressionStatement(assign),
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
				const policyAssign = createAssign(
					createVariable('permission'),
					createStaticCall(
						createName(['Policy']),
						createIdentifier('enforce'),
						[
							createArg(createScalarString(options.route.policy)),
							createArg(createVariable('request')),
						]
					)
				);
				const assignPrintable = createPrintable(
					createExpressionStatement(policyAssign),
					[
						`${indent}$permission = Policy::enforce( '${escapeSingleQuotes(
							options.route.policy
						)}', $request );`,
					]
				);
				body.statement(assignPrintable);

				const isErrorCall = createFuncCall(
					createName(['is_wp_error']),
					[createArg(createVariable('permission'))]
				);
				const ifNode = createNode<PhpStmtIf>('Stmt_If', {
					cond: isErrorCall,
					stmts: [createReturn(createVariable('permission'))],
					elseifs: [],
					else: null,
				});
				const ifPrintable = createPrintable(ifNode, [
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
