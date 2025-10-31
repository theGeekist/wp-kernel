import { buildStmtNop, type PhpStmt } from '@wpkernel/php-json-ast';

import type { ResourceMetadataHost } from '../../common/metadata/cache';
import type { ResourceControllerRouteMetadata } from '../../types';
import {
	buildResourceControllerRouteSet,
	type BuildResourceControllerRouteSetOptions,
	type RestControllerRouteFallbackContext,
	type RestControllerRouteHandlers,
	type RestControllerRouteOptionHandlers,
	type RestControllerRouteTransientHandlers,
} from '../routes';

function createHost(): ResourceMetadataHost {
	return {
		getMetadata: () =>
			({
				kind: 'resource-controller',
				name: 'resource',
				identity: { type: 'number', param: 'id' },
				routes: [],
			}) as never,
		setMetadata: jest.fn(),
	} satisfies ResourceMetadataHost;
}

function createMetadata(
	overrides: Partial<ResourceControllerRouteMetadata> = {}
): ResourceControllerRouteMetadata {
	return {
		method: 'GET',
		path: '/items',
		kind: 'list',
		...overrides,
	} satisfies ResourceControllerRouteMetadata;
}

function createPlan(
	options: Omit<BuildResourceControllerRouteSetOptions, 'plan'> & {
		readonly metadata: ResourceControllerRouteMetadata;
		readonly fallbackContext?: RestControllerRouteFallbackContext;
	}
) {
	const plan = buildResourceControllerRouteSet({
		plan: {
			definition: {
				method: options.metadata.method,
				path: options.metadata.path,
			},
			methodName: 'handle',
			docblockSummary: 'Handle request.',
		},
		...options,
		fallbackContext: options.fallbackContext,
	});

	return {
		resolve: () =>
			plan.buildStatements({
				metadata: options.metadata,
				metadataHost: createHost(),
			}),
		buildFallback: () => plan.buildFallbackStatements?.() ?? [],
	};
}

function createHandler(label: string) {
	return () => [buildStmtNop({ comments: [{ text: label }] })];
}

function extractComment(statement: PhpStmt | undefined): string | undefined {
	const attributes = statement?.attributes as
		| { comments?: readonly { text?: string }[] }
		| undefined;
	return attributes?.comments?.[0]?.text;
}

describe('buildResourceControllerRouteSet', () => {
	it('resolves default handlers based on route kind', () => {
		const handlers: RestControllerRouteHandlers = {
			list: jest.fn(createHandler('list')),
			get: jest.fn(createHandler('get')),
			create: jest.fn(createHandler('create')),
			update: jest.fn(createHandler('update')),
			remove: jest.fn(createHandler('remove')),
			custom: jest.fn(createHandler('custom')),
		};

		const plan = createPlan({
			metadata: createMetadata({ kind: 'update' }),
			handlers,
		});

		const statements = plan.resolve();

		expect(statements).toHaveLength(1);
		expect(handlers.update).toHaveBeenCalled();
		expect(handlers.list).not.toHaveBeenCalled();
		expect(extractComment(statements?.[0])).toBe('update');
	});

	it('uses option handlers when storage mode is wp-option', () => {
		const optionHandlers: RestControllerRouteOptionHandlers = {
			get: jest.fn(createHandler('option:get')),
			update: jest.fn(createHandler('option:update')),
			unsupported: jest.fn(createHandler('option:unsupported')),
		};

		const plan = createPlan({
			metadata: createMetadata({ method: 'PUT', kind: 'update' }),
			storageMode: 'wp-option',
			optionHandlers,
		});

		const statements = plan.resolve();

		expect(optionHandlers.update).toHaveBeenCalled();
		expect(optionHandlers.get).not.toHaveBeenCalled();
		expect(extractComment(statements?.[0])).toBe('option:update');
	});

	it('routes transient handlers based on HTTP method', () => {
		const transientHandlers: RestControllerRouteTransientHandlers = {
			get: jest.fn(createHandler('transient:get')),
			set: jest.fn(createHandler('transient:set')),
			delete: jest.fn(createHandler('transient:delete')),
			unsupported: jest.fn(createHandler('transient:unsupported')),
		};

		const plan = createPlan({
			metadata: createMetadata({ method: 'DELETE', kind: 'remove' }),
			storageMode: 'transient',
			transientHandlers,
		});

		const statements = plan.resolve();

		expect(transientHandlers.delete).toHaveBeenCalled();
		expect(transientHandlers.set).not.toHaveBeenCalled();
		expect(extractComment(statements?.[0])).toBe('transient:delete');
	});

	it('returns null when no handler matches the storage mode', () => {
		const plan = createPlan({
			metadata: createMetadata({ method: 'OPTIONS', kind: 'custom' }),
			storageMode: 'transient',
			transientHandlers: {
				get: jest.fn(),
				set: jest.fn(),
				delete: jest.fn(),
			},
		});

		expect(plan.resolve()).toBeNull();
	});

	it('builds TODO stubs as the default fallback', () => {
		const plan = createPlan({
			metadata: createMetadata({
				method: 'GET',
				path: '/jobs',
				kind: 'custom',
			}),
			handlers: {},
		});

		const fallback = plan.buildFallback();

		expect(fallback[0]).toMatchObject({ nodeType: 'Stmt_Nop' });
		expect(extractComment(fallback[0])).toBe(
			'// TODO: Implement handler for [GET] /jobs.'
		);
		expect(fallback[0]?.attributes?.['wpk:fallback']).toEqual({
			method: 'GET',
			path: '/jobs',
		});
		expect(fallback[1]).toMatchObject({
			nodeType: 'Stmt_Return',
			expr: expect.objectContaining({
				nodeType: 'Expr_New',
				class: expect.objectContaining({
					parts: ['WP_Error'],
				}),
			}),
			attributes: expect.objectContaining({
				'wpk:fallback': { method: 'GET', path: '/jobs' },
			}),
		});
	});

	it('embeds fallback metadata when context is provided', () => {
		const reason = 'Storage helper missing route handler.';
		const hint = 'Run storage helper prior to the controller helper.';
		const plan = createPlan({
			metadata: createMetadata({
				method: 'POST',
				path: '/jobs',
				kind: 'create',
			}),
			handlers: {},
			fallbackContext: {
				resource: 'jobs',
				transport: 'local',
				kind: 'create',
				storageMode: 'wp-post',
				reason,
				hint,
			},
		});

		const [nop, ret] = plan.buildFallback();

		expect(nop?.attributes?.comments).toHaveLength(3);
		expect(nop?.attributes?.['wpk:fallback']).toEqual({
			method: 'POST',
			path: '/jobs',
			resource: 'jobs',
			transport: 'local',
			kind: 'create',
			storageMode: 'wp-post',
			reason,
			hint,
		});
		expect(ret?.attributes?.['wpk:fallback']).toEqual(
			nop?.attributes?.['wpk:fallback']
		);
	});

	it('supports overriding fallback builders', () => {
		const fallback = [buildStmtNop()];
		const plan = createPlan({
			metadata: createMetadata(),
			handlers: {},
			buildFallbackStatements: () => fallback,
		});

		expect(plan.buildFallback()).toBe(fallback);
	});
});
