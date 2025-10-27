/**
 * @file Integration test covering defineAction orchestration with resources.
 *
 * Tests comprehensive action flows including:
 * - Resource integration and event emission
 * - Error handling and lifecycle events
 * - Policy enforcement
 * - Background job integration
 * - Cache invalidation
 * - Cross-tab vs tab-local scoping
 */

import { defineAction } from '../../actions/define';
import type { ActionConfig, ActionOptions } from '../../actions/types';
import {
	withActionRuntimeOverrides,
	type ActionRuntimeOverrides,
	createWordPressTestHarness,
	type WordPressTestHarness,
} from '@wpkernel/test-utils/core';
import { defineResource } from '../../resource/define';
import * as cache from '../../resource/cache';
import { WPKernelError } from '../../error/index';

function createAction<TArgs = void, TResult = void>(
	name: string,
	handler: ActionConfig<TArgs, TResult>['handler'],
	options?: ActionOptions
) {
	return defineAction<TArgs, TResult>({ name, handler, options });
}

describe('Action Flow Integration', () => {
	let harness: WordPressTestHarness;
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;

	beforeEach(() => {
		harness = createWordPressTestHarness({
			apiFetch: jest.fn(),
			hooks: { doAction: jest.fn() },
		});

		mockApiFetch = harness.wp.apiFetch as unknown as jest.Mock;
		mockDoAction = harness.wp.hooks?.doAction as unknown as jest.Mock;
	});

	afterEach(() => {
		harness.teardown();
	});

	describe('scope resolution matrix', () => {
		const originalBroadcastChannel = global.BroadcastChannel;
		const originalWindowBroadcastChannel = window.BroadcastChannel;

		afterEach(() => {
			global.BroadcastChannel = originalBroadcastChannel;
			if (originalWindowBroadcastChannel === undefined) {
				delete (
					window as { BroadcastChannel?: typeof BroadcastChannel }
				).BroadcastChannel;
			} else {
				window.BroadcastChannel = originalWindowBroadcastChannel;
			}
		});

		const scenarios: Array<{
			title: string;
			options?: ActionOptions;
			expectBridge: boolean;
			expectScope: 'crossTab' | 'tabLocal';
			expectBroadcast: boolean;
		}> = [
			{
				title: 'defaults to cross-tab bridged actions',
				options: undefined,
				expectBridge: true,
				expectScope: 'crossTab',
				expectBroadcast: true,
			},
			{
				title: 'supports cross-tab scope without bridging',
				options: { scope: 'crossTab', bridged: false },
				expectBridge: false,
				expectScope: 'crossTab',
				expectBroadcast: false,
			},
			{
				title: 'keeps tab-local actions unbridged',
				options: { scope: 'tabLocal' },
				expectBridge: false,
				expectScope: 'tabLocal',
				expectBroadcast: false,
			},
		];

		it.each(scenarios)(
			'%s',
			async ({ options, expectBridge, expectScope, expectBroadcast }) => {
				const channelInstances: Array<{
					postMessage: jest.Mock;
					close: jest.Mock;
				}> = [];
				const broadcastFactory = jest.fn(() => {
					const instance = {
						postMessage: jest.fn(),
						close: jest.fn(),
					};
					channelInstances.push(instance);
					return instance;
				});
				global.BroadcastChannel =
					broadcastFactory as unknown as typeof global.BroadcastChannel;
				window.BroadcastChannel =
					broadcastFactory as unknown as typeof window.BroadcastChannel;

				const resource = defineResource<{ id: number; title: string }>({
					name: 'thing',
					routes: {
						create: { path: '/wpk/v1/things', method: 'POST' },
					},
				});

				const createdThing = { id: 42, title: 'Created' };
				mockApiFetch.mockResolvedValue(createdThing);

				const CreateThing = createAction<
					{ data: { title: string } },
					{ id: number; title: string }
				>(
					'Thing.Create.Scope',
					async (ctx, { data }) => {
						const created = await resource.create!(data);
						ctx.emit(resource.events!.created, {
							id: created.id,
						});
						return created;
					},
					options
				);

				await CreateThing({ data: { title: 'Created' } });

				expect(mockDoAction).toHaveBeenCalledWith(
					'wpk.action.start',
					expect.objectContaining({
						actionName: 'Thing.Create.Scope',
						scope: expectScope,
						bridged: expectBridge,
					})
				);

				const domainEvent = mockDoAction.mock.calls.find(
					([eventName]) => eventName === resource.events!.created
				);
				expect(domainEvent).toBeDefined();

				if (expectBroadcast) {
					expect(broadcastFactory).toHaveBeenCalled();
					expect(
						channelInstances[0]?.postMessage
					).toHaveBeenCalledWith(
						expect.objectContaining({
							event: resource.events!.created,
						})
					);
				} else {
					expect(broadcastFactory).not.toHaveBeenCalled();
				}
			}
		);
	});

	it('executes resource create flow and emits canonical events', async () => {
		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);
		const invalidateSpy = jest
			.spyOn(cache, 'invalidate')
			.mockImplementation(() => undefined);

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const CreateThing = createAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>('Thing.Create', async (ctx, { data }) => {
			const created = await resource.create!(data);
			const events = resource.events!;
			ctx.emit(events.created, { id: created.id, data: created });
			ctx.invalidate(['thing', 'list']);
			return created;
		});

		const result = await CreateThing({ data: { title: 'Created' } });

		expect(result).toEqual(createdThing);
		expect(mockApiFetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'POST',
			data: { title: 'Created' },
			parse: true,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Thing.Create' })
		);
		const events = resource.events!;
		expect(mockDoAction).toHaveBeenCalledWith(events.created, {
			id: createdThing.id,
			data: createdThing,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({
				actionName: 'Thing.Create',
				result: createdThing,
			})
		);
		expect(invalidateSpy).toHaveBeenCalledWith(
			['thing', 'list'],
			undefined
		);

		invalidateSpy.mockRestore();
	});

	it('handles errors and emits wpk.action.error lifecycle event', async () => {
		const errorMessage = 'Network failure';
		mockApiFetch.mockRejectedValue(new Error(errorMessage));

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				update: { path: '/wpk/v1/things/:id', method: 'PUT' },
			},
		});

		const UpdateThing = createAction<
			{ id: number; updates: { title: string } },
			{ id: number; title: string }
		>('Thing.Update', async (ctx, { id, updates }) => {
			const updated = await resource.update!(id, updates);
			ctx.invalidate([`thing:${id}`, 'list']);
			return updated;
		});

		await expect(
			UpdateThing({ id: 1, updates: { title: 'New Title' } })
		).rejects.toThrow();

		// Verify error lifecycle event was emitted
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({
				actionName: 'Thing.Update',
				phase: 'error',
			})
		);
	});

	describe('policy enforcement matrix', () => {
		const scenarios: Array<{
			title: string;
			overrides: ActionRuntimeOverrides;
			expectRejection: boolean;
		}> = [
			{
				title: 'allows action when runtime grants capability',
				overrides: {
					policy: {
						assert: jest.fn(),
						can: jest.fn().mockResolvedValue(true),
					},
				},
				expectRejection: false,
			},
			{
				title: 'surfaces denial when runtime throws',
				overrides: {
					policy: {
						assert: jest.fn(() => {
							throw new WPKernelError('PolicyDenied', {
								message: 'denied',
							});
						}),
						can: jest.fn().mockResolvedValue(false),
					},
				},
				expectRejection: true,
			},
		];

		it.each(scenarios)('%s', async ({ overrides, expectRejection }) => {
			const resource = defineResource<{ id: number; title: string }>({
				name: 'thing',
				routes: {
					update: { path: '/wpk/v1/things/:id', method: 'PUT' },
				},
			});

			const UpdateThing = createAction<
				{ id: number; updates: { title: string } },
				{ id: number; title: string }
			>('Thing.Update.Policy', async (ctx, { id, updates }) => {
				ctx.policy.assert('edit_things', undefined);
				const result = await resource.update!(id, updates);
				ctx.invalidate([`thing:${id}`, 'list']);
				return result;
			});

			mockApiFetch.mockResolvedValue({ id: 1, title: 'Updated' });

			const invocation = withActionRuntimeOverrides(overrides, () =>
				UpdateThing({ id: 1, updates: { title: 'Updated' } })
			);

			if (expectRejection) {
				await expect(invocation).rejects.toMatchObject({
					message: 'denied',
				});
				expect(mockApiFetch).not.toHaveBeenCalled();
				expect(mockDoAction).toHaveBeenCalledWith(
					'wpk.action.error',
					expect.objectContaining({
						actionName: 'Thing.Update.Policy',
						phase: 'error',
					})
				);
			} else {
				await expect(invocation).resolves.toEqual({
					id: 1,
					title: 'Updated',
				});
				expect(mockApiFetch).toHaveBeenCalledWith({
					path: '/wpk/v1/things/1',
					method: 'PUT',
					data: { title: 'Updated' },
					parse: true,
				});
				expect(mockDoAction).toHaveBeenCalledWith(
					'wpk.action.complete',
					expect.objectContaining({
						actionName: 'Thing.Update.Policy',
						result: { id: 1, title: 'Updated' },
					})
				);
			}
		});
	});

	it('integrates with background jobs', async () => {
		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const enqueueJob = jest.fn(async (jobName: string, payload: any) => {
			expect(jobName).toBe('ProcessNewThing');
			expect(payload).toEqual({ thingId: 42 });
		});

		const overrides: ActionRuntimeOverrides = {
			runtime: {
				jobs: {
					enqueue: enqueueJob,
					wait: jest.fn().mockResolvedValue({}),
				},
			},
		};

		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);

		const CreateThing = createAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>('Thing.Create', async (ctx, { data }) => {
			const created = await resource.create!(data);
			await ctx.jobs.enqueue('ProcessNewThing', { thingId: created.id });
			return created;
		});

		await withActionRuntimeOverrides(overrides, () =>
			CreateThing({ data: { title: 'Created' } })
		);

		expect(enqueueJob).toHaveBeenCalledWith('ProcessNewThing', {
			thingId: 42,
		});
	});
});
