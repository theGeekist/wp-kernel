import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { createPhpFileBuilder } from '../ast/programBuilder';
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
	createScalarInt,
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
	type PhpExprNew,
	createStmtNop,
	createComment,
} from '../ast/nodes';
import { createPrintable } from '../ast/printables';
import {
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '../ast/modifiers';
import { createPhpReturn } from '../ast/valueRenderers';
import { escapeSingleQuotes, sanitizeJson, toPascalCase } from '../ast/utils';
import type { IRResource, IRRoute, IRSchema, IRv1 } from '../../../../ir/types';
import type { PhpAstBuilderAdapter } from '../ast/programBuilder';
import { resolveIdentityConfig, type ResolvedIdentity } from './identity';
import {
	collectCanonicalBasePaths,
	determineRouteKind,
	type ResourceRouteKind,
} from './routes';
import type {
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../ast/types';

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
	const canonicalBasePaths = collectCanonicalBasePaths(
		resource.routes,
		identity.param
	);
	const routeMetadata = createRouteMetadata({
		routes: resource.routes,
		identity,
		canonicalBasePaths,
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
			ir,
			resource,
			route,
			identity,
			routeKind: routeMetadata[index]?.kind ?? 'custom',
		})
	);

	methods.push(...routeMethods);

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
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly route: IRRoute;
	readonly identity: ResolvedIdentity;
	readonly routeKind: RouteMetadataKind;
}

type RouteMetadataKind = ResourceRouteKind | 'custom';

function createRouteMethodTemplate(
	options: RouteTemplateOptions
): PhpMethodTemplate {
	const methodName = createRouteMethodName(options.route, options.ir);
	const indentLevel = 1;
	const docblock = [
		`Handle [${options.route.method}] ${options.route.path}.`,
		`@wp-kernel route-kind ${options.routeKind}`,
	];

	return createMethodTemplate({
		signature: `public function ${methodName}( WP_REST_Request $request )`,
		indentLevel,
		indentUnit: PHP_INDENT,
		docblock,
		body: (body) => {
			const indent = PHP_INDENT.repeat(indentLevel + 1);

			if (routeUsesIdentity(options)) {
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

			const todoPrintable = createPrintable(
				createStmtNop({
					comments: [
						createComment(
							`// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`
						),
					],
				}),
				[
					`${indent}// TODO: Implement handler for [${options.route.method}] ${options.route.path}.`,
				]
			);
			body.statement(todoPrintable);

			const errorExpr = createNode<PhpExprNew>('Expr_New', {
				class: createName(['WP_Error']),
				args: [
					createArg(createScalarInt(501)),
					createArg(createScalarString('Not Implemented')),
				],
			});
			const returnPrintable = createPrintable(createReturn(errorExpr), [
				`${indent}return new WP_Error( 501, 'Not Implemented' );`,
			]);
			body.statement(returnPrintable);
		},
	});
}

function routeUsesIdentity(options: RouteTemplateOptions): boolean {
	if (
		options.routeKind === 'get' ||
		options.routeKind === 'update' ||
		options.routeKind === 'remove'
	) {
		return true;
	}

	const placeholder = `:${options.identity.param.toLowerCase()}`;
	return options.route.path.toLowerCase().includes(placeholder);
}

interface CreateRouteMetadataOptions {
	readonly routes: readonly IRRoute[];
	readonly identity: ResolvedIdentity;
	readonly canonicalBasePaths: Set<string>;
}

function createRouteMetadata(
	options: CreateRouteMetadataOptions
): ResourceControllerMetadata['routes'] {
	const { routes, identity, canonicalBasePaths } = options;

	return routes.map<ResourceControllerRouteMetadata>((route) => {
		const kind =
			determineRouteKind(route, identity.param, canonicalBasePaths) ??
			'custom';

		return {
			method: route.method,
			path: route.path,
			kind,
		};
	});
}

function createRouteMethodName(route: IRRoute, ir: IRv1): string {
	const method = route.method.toLowerCase();
	const segments = deriveRouteSegments(route.path, ir);
	const suffix = segments.map(toPascalCase).join('') || 'Route';
	return `${method}${suffix}`;
}

function deriveRouteSegments(path: string, ir: IRv1): string[] {
	const trimmed = path.replace(/^\/+/, '');
	if (!trimmed) {
		return [];
	}

	const segments = trimmed
		.split('/')
		.filter((segment): segment is string => segment.length > 0)
		.map((segment: string) => segment.replace(/^:/, ''));

	const namespaceVariants = new Set<string>(
		[
			ir.meta.namespace,
			ir.meta.namespace.replace(/\\/g, '/'),
			ir.meta.sanitizedNamespace,
			ir.meta.sanitizedNamespace.replace(/\\/g, '/'),
		]
			.map((value) =>
				value
					.split('/')
					.filter((segment): segment is string => segment.length > 0)
					.map((segment: string) => segment.toLowerCase())
			)
			.map((variant: string[]) => variant.join('/'))
	);

	const normalisedSegments = segments.map((segment: string) =>
		segment.toLowerCase()
	);

	for (const variant of namespaceVariants) {
		const variantSegments = variant.split('/');
		let matches = true;
		for (let index = 0; index < variantSegments.length; index += 1) {
			if (normalisedSegments[index] !== variantSegments[index]) {
				matches = false;
				break;
			}
		}

		if (matches) {
			return segments.slice(variantSegments.length);
		}
	}

	return segments;
}

function buildRestArgs(
	schemas: readonly IRSchema[],
	resource: IRResource
): Record<string, unknown> {
	const schema = schemas.find((entry) => entry.key === resource.schemaKey);
	if (!schema) {
		return {};
	}

	const schemaValue = schema.schema;
	if (!isRecord(schemaValue)) {
		return {};
	}

	const required = new Set(
		Array.isArray(schemaValue.required)
			? (schemaValue.required as string[])
			: []
	);

	const properties = isRecord(schemaValue.properties)
		? (schemaValue.properties as Record<string, unknown>)
		: {};

	const restArgs: Record<string, unknown> = {};
	for (const [key, descriptor] of Object.entries(properties)) {
		const payload: Record<string, unknown> = {
			schema: sanitizeJson(descriptor),
		};

		if (required.has(key)) {
			payload.required = true;
		}

		if (resource.identity?.param === key) {
			payload.identity = resource.identity;
		}

		restArgs[key] = payload;
	}

	if (resource.queryParams) {
		applyQueryParams(restArgs, resource.queryParams);
	}

	return restArgs;
}

function applyQueryParams(
	restArgs: Record<string, unknown>,
	queryParams: NonNullable<IRResource['queryParams']>
): void {
	const entries = Object.entries(queryParams) as Array<
		[string, NonNullable<IRResource['queryParams']>[string]]
	>;

	for (const [param, descriptor] of entries) {
		const existing = isRecord(restArgs[param])
			? { ...(restArgs[param] as Record<string, unknown>) }
			: {};

		const schemaPayload = isRecord(existing.schema)
			? { ...(existing.schema as Record<string, unknown>) }
			: {};

		if (descriptor.type === 'enum') {
			schemaPayload.type = 'string';
			if (descriptor.enum) {
				schemaPayload.enum = Array.from(descriptor.enum);
			}
		} else {
			schemaPayload.type = descriptor.type;
		}

		if (descriptor.description) {
			existing.description = descriptor.description;
		}

		if (descriptor.optional === false) {
			existing.required = true;
		}

		existing.schema = sanitizeJson(schemaPayload);
		restArgs[param] = sanitizeJson(existing);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
