import {
	DataViewsMock,
	createKernelRuntime,
	type RuntimeWithDataViews,
	flushDataViews,
	buildActionConfig,
	renderActionScenario,
	createAction,
	createDataViewsTestController,
	type DefaultActionInput,
} from '../test-support/ResourceDataView.test-support';
import { act } from 'react';
import { KernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import type { ResourceDataViewActionConfig } from '../types';

describe('ResourceDataView actions', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('executes actions and invalidates caches', async () => {
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const resourceInvalidate = jest.fn();
		const { runtime, getActionEntries } = renderActionScenario({
			items: [{ id: 1 }, { id: 2 }],
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
			resourceOverrides: { invalidate: resourceInvalidate },
		});

		const [firstAction] = getActionEntries();
		expect(firstAction).toBeDefined();

		await act(async () => {
			await firstAction!.callback([{ id: 1 }, { id: 2 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(actionImpl).toHaveBeenCalledWith({ selection: ['1', '2'] });
		expect(runtime.invalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(resourceInvalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: true,
			})
		);
	});

	it('disables actions when policies deny access', async () => {
		const runtime = createKernelRuntime();
		const policyCan = jest.fn().mockResolvedValue(false);
		runtime.policies = {
			policy: {
				can: policyCan,
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews();

		const actions = getActionEntries();
		expect(actions).toHaveLength(1);
		expect(actions[0]?.disabled).toBe(true);
		expect(policyCan).toHaveBeenCalledWith('jobs.delete');
	});

	it('omits denied actions when disabledWhenDenied is false', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const { getDataViewProps } = renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: false,
			},
		});

		await flushDataViews();

		expect(getDataViewProps().actions).toEqual([]);
	});

	it('warns when policy evaluation promise rejects', async () => {
		const runtime = createKernelRuntime();
		const warnSpy = runtime.dataviews.reporter.warn as jest.Mock;
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews(2);

		expect(warnSpy).toHaveBeenCalledWith(
			'Policy evaluation failed for DataViews action',
			expect.objectContaining({ policy: 'jobs.delete' })
		);
	});

	it('logs errors when policy evaluation throws synchronously', () => {
		const runtime = createKernelRuntime();
		const errorSpy = runtime.dataviews.reporter.error as jest.Mock;
		runtime.policies = {
			policy: {
				can: jest.fn(() => {
					throw new Error('boom');
				}),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
			},
		});

		expect(errorSpy).toHaveBeenCalledWith(
			'Policy evaluation threw an error',
			{
				error: expect.any(Error),
				policy: 'jobs.delete',
			}
		);
	});

	it('respects invalidateOnSuccess overrides', async () => {
		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const resourceInvalidate = jest.fn();
		const invalidate = jest.fn();
		runtime.invalidate = invalidate;

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				invalidateOnSuccess: () => false,
			},
			resourceOverrides: { invalidate: resourceInvalidate },
		});

		const [firstAction] = getActionEntries();
		expect(firstAction).toBeDefined();

		await act(async () => {
			await firstAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(invalidate).not.toHaveBeenCalled();
		expect(resourceInvalidate).not.toHaveBeenCalled();
	});

	it('disables actions when no policy runtime is available', () => {
		const runtime = createKernelRuntime();
		runtime.policies = undefined;

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		const actions = getActionEntries();
		expect(actions).toHaveLength(1);
		const [firstAction] = actions;
		expect(firstAction).toBeDefined();
		expect(firstAction!.disabled).toBe(true);
	});

	it('disables policy-gated actions when policy runtime is not available', () => {
		const runtime = createKernelRuntime();
		runtime.policies = undefined;

		const { getActionEntries } = renderActionScenario({
			runtime,
			actions: [
				buildActionConfig({
					policy: 'jobs.delete',
					disabledWhenDenied: true,
				}),
				buildActionConfig({
					id: 'edit',
					label: 'Edit',
					policy: 'jobs.edit',
					disabledWhenDenied: true,
				}),
			],
		});

		const actions = getActionEntries();
		expect(actions).toHaveLength(2);
		const [firstAction, secondAction] = actions;
		expect(firstAction).toBeDefined();
		expect(secondAction).toBeDefined();
		expect(firstAction!.disabled).toBe(true);
		expect(secondAction!.disabled).toBe(true);
	});

	it('keeps policy-free actions enabled even with policy runtime present', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.resolve(true)),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const { getActionEntries } = renderActionScenario({
			runtime,
			actions: [
				buildActionConfig({ policy: 'jobs.delete' }),
				buildActionConfig({
					id: 'view',
					label: 'View',
				}),
			],
		});

		await flushDataViews();

		const actions = getActionEntries();
		expect(actions).toHaveLength(2);
		const [firstAction, secondAction] = actions;
		expect(firstAction).toBeDefined();
		expect(secondAction).toBeDefined();
		expect(firstAction!.disabled).toBe(false);
		expect(secondAction!.disabled).toBe(false);
	});

	it('emits a pending event while policy resolution is in progress', async () => {
		const runtime = createKernelRuntime();
		let resolvePolicy: ((value: boolean) => void) | undefined;
		runtime.policies = {
			policy: {
				can: jest.fn(
					() =>
						new Promise<boolean>((resolve) => {
							resolvePolicy = resolve;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const actionImpl = jest.fn();
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		const [pendingAction] = getActionEntries();
		expect(pendingAction).toBeDefined();

		await act(async () => {
			await pendingAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'policy-pending',
			})
		);
		expect(actionImpl).not.toHaveBeenCalled();

		resolvePolicy?.(true);
		await flushDataViews();
	});

	it('warns when executing a denied policy-gated action', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.resolve(false)),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const actionImpl = jest.fn();
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews();

		const [deniedAction] = getActionEntries();

		await act(async () => {
			await deniedAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'policy-denied',
			})
		);
		expect(runtime.dataviews.reporter.warn).toHaveBeenCalledWith(
			'DataViews action blocked by policy',
			expect.objectContaining({ actionId: 'delete' })
		);
		expect(actionImpl).not.toHaveBeenCalled();
	});

	it('emits an empty-selection action event', async () => {
		const runtime = createKernelRuntime();

		const { getActionEntries } = renderActionScenario({ runtime });

		const [actionEntry] = getActionEntries();

		await act(async () => {
			await actionEntry!.callback([], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'empty-selection',
			})
		);
	});

	it('normalizes mixed selection flows via the controller helper', async () => {
		type MixedItem = {
			id: string | number;
			slug?: string;
			legacyId?: number;
		};

		const items: MixedItem[] = [
			{ id: 1, slug: 'alpha' },
			{ id: 2, slug: 'beta', legacyId: 22 },
			{ id: 0 },
			{ id: 'custom-3' },
			{ id: 4, legacyId: 99 },
			{ id: 5 },
		];

		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		type MixedActionConfig = ResourceDataViewActionConfig<
			MixedItem,
			DefaultActionInput,
			unknown
		>;

		const buildMetaImpl = jest.fn(
			({
				selection,
			}: Parameters<NonNullable<MixedActionConfig['buildMeta']>>[0]) => ({
				selectionCount: selection.length,
			})
		);

		const scenario = renderActionScenario<MixedItem>({
			runtime,
			items,
			configOverrides: {
				getItemId: (item: MixedItem) => {
					if (item.slug) {
						return `${item.slug}-slug`;
					}
					if (typeof item.legacyId === 'number') {
						return `legacy-${item.legacyId}`;
					}
					if (typeof item.id === 'number') {
						if (item.id === 5) {
							return '';
						}
						return `num-${item.id}`;
					}
					if (typeof item.id === 'string') {
						return item.id;
					}
					return '';
				},
			},
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				buildMeta: ((context) =>
					buildMetaImpl(context)) as MixedActionConfig['buildMeta'],
			},
		});

		const controller = createDataViewsTestController(scenario);

		const first = items[0]!;
		const second = items[1]!;
		const third = items[2]!;
		const fourth = items[3]!;
		const fifth = items[4]!;
		const sixth = items[5]!;

		controller.setSelection(['manual-only']);
		controller.setSelectionFromItems([third, sixth]);

		const mixedSelection = controller.getProps().selection ?? [];

		controller.setSelection(['manual-only', ...mixedSelection, '42']);

		await flushDataViews();

		const [entry] = scenario.getActionEntries();
		const onActionPerformed = jest.fn();

		const selectedItems = [first, second, third, fourth, fifth, sixth];

		await act(async () => {
			await entry!.callback(selectedItems, {
				onActionPerformed,
			});
		});

		const expectedSelection = [
			'alpha-slug',
			'beta-slug',
			'num-0',
			'custom-3',
			'legacy-99',
		];

		expect(actionImpl).toHaveBeenCalledWith({
			selection: expectedSelection,
		});
		expect(buildMetaImpl).toHaveBeenCalledWith({
			selection: expectedSelection,
			items: selectedItems,
		});
		expect(
			runtime.dataviews.events.actionTriggered
		).toHaveBeenLastCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: true,
				selection: expectedSelection,
				meta: { selectionCount: expectedSelection.length },
			})
		);
		expect(onActionPerformed).toHaveBeenCalledWith(selectedItems);
	});

	it('normalizes unexpected errors thrown by action callbacks', async () => {
		const runtime = createKernelRuntime();

		const actionImpl = jest.fn().mockRejectedValue(new Error('boom'));
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		const [actionEntry] = getActionEntries();

		const rejection = await actionEntry!
			.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			})
			.catch((error: unknown) => error);

		expect(rejection).toBeInstanceOf(KernelError);
		expect((rejection as KernelError).code).toBe('UnknownError');
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Unhandled error thrown by DataViews action',
			expect.objectContaining({ selection: ['1'] })
		);
	});

	it('invalidates custom cache patterns returned by actions', async () => {
		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const customPatterns: CacheKeyPattern[] = [['jobs', 'custom']];
		const { getActionEntries, resource } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				invalidateOnSuccess: () => customPatterns,
			},
		});

		const [actionEntry] = getActionEntries();

		await act(async () => {
			await actionEntry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.invalidate).toHaveBeenCalledWith(customPatterns);
		expect(resource.invalidate).toHaveBeenCalledWith(customPatterns);
	});

	it('ignores policy resolution when component unmounts before completion', async () => {
		const runtime = createKernelRuntime();
		let resolvePolicy: ((value: boolean) => void) | undefined;
		runtime.policies = {
			policy: {
				can: jest.fn(
					() =>
						new Promise<boolean>((resolve) => {
							resolvePolicy = resolve;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const { renderResult } = renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		renderResult.unmount();
		resolvePolicy?.(true);

		await flushDataViews();

		expect(runtime.dataviews.reporter.warn).not.toHaveBeenCalled();
	});

	it('ignores policy rejections after unmount', async () => {
		const runtime = createKernelRuntime();
		let rejectPolicy: ((reason?: unknown) => void) | undefined;
		runtime.policies = {
			policy: {
				can: jest.fn(
					() =>
						new Promise<boolean>((_, reject) => {
							rejectPolicy = reject;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const { renderResult: rejectionRender } = renderActionScenario({
			runtime,
			action: {
				policy: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		rejectionRender.unmount();
		rejectPolicy?.(new Error('denied'));

		await flushDataViews();

		expect(runtime.dataviews.reporter.warn).not.toHaveBeenCalled();
	});
});
