import {
	DataViewsMock,
	createKernelRuntime,
	renderWithProvider,
	createResource,
	createAction,
	type RuntimeWithDataViews,
	createConfig,
	getLastDataViewsProps,
} from '../test-support/ResourceDataView.test-support';
import { act } from 'react';
import { ResourceDataView } from '../ResourceDataView';

describe('ResourceDataView actions', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('executes actions and invalidates caches', async () => {
		const runtime = createKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const deleteAction = createAction(actionImpl, {
			scope: 'crossTab',
			bridged: true,
		});

		const resourceInvalidate = jest.fn();
		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }, { id: 2 }], total: 2 },
				isLoading: false,
				error: undefined,
			})),
			invalidate: resourceInvalidate,
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: deleteAction,
					label: 'Delete',
					supportsBulk: true,
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = getLastDataViewsProps();
		const actions = props.actions as unknown as Array<{
			callback: (items: unknown[], context: unknown) => Promise<unknown>;
		}>;
		expect(actions).toHaveLength(1);
		const [firstAction] = actions;
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

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.actions).toHaveLength(1);
		expect(props.actions?.[0]?.disabled).toBe(true);
		expect(policyCan).toHaveBeenCalledWith('jobs.delete');
	});

	it('omits denied actions when disabledWhenDenied is false', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.actions).toEqual([]);
	});

	it('warns when policy evaluation promise rejects', async () => {
		const runtime = createKernelRuntime();
		const warnSpy = runtime.dataviews.reporter.warn as jest.Mock;
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					disabledWhenDenied: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

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

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

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
		const deleteAction = createAction(actionImpl, {
			scope: 'crossTab',
			bridged: true,
		});

		const resourceInvalidate = jest.fn();
		const invalidate = jest.fn();
		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }, { id: 2 }], total: 2 },
				isLoading: false,
				error: undefined,
			})),
			invalidate: resourceInvalidate,
		});
		runtime.invalidate = invalidate;

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: deleteAction,
					label: 'Delete',
					supportsBulk: true,
					getActionArgs: ({ selection }) => ({ selection }),
					invalidateOnSuccess: () => false,
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = getLastDataViewsProps();
		const actions = props.actions as unknown as Array<{
			callback: (items: unknown[], context: unknown) => Promise<unknown>;
		}>;
		const [firstAction] = actions;
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

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					disabledWhenDenied: true,
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = getLastDataViewsProps();
		expect(props.actions).toHaveLength(1);
		expect(props.actions?.[0]?.disabled).toBe(true);
	});

	it('disables policy-gated actions when policy runtime is not available', () => {
		const runtime = createKernelRuntime();
		runtime.policies = undefined;

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
					disabledWhenDenied: true,
				},
				{
					id: 'edit',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Edit',
					supportsBulk: true,
					policy: 'jobs.edit',
					getActionArgs: ({ selection }) => ({ selection }),
					disabledWhenDenied: true,
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		const props = getLastDataViewsProps();
		expect(props.actions?.[0]?.disabled).toBe(true);
		expect(props.actions?.[1]?.disabled).toBe(true);
	});

	it('keeps policy-free actions enabled even with policy runtime present', async () => {
		const runtime = createKernelRuntime();
		runtime.policies = {
			policy: {
				can: jest.fn(() => Promise.resolve(true)),
			},
		} as unknown as RuntimeWithDataViews['policies'];

		const resource = createResource<{ id: number }, { search?: string }>({
			useList: jest.fn(() => ({
				data: { items: [{ id: 1 }], total: 1 },
				isLoading: false,
				error: undefined,
			})),
		});

		const config = createConfig<{ id: number }, { search?: string }>({
			actions: [
				{
					id: 'delete',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'Delete',
					supportsBulk: true,
					policy: 'jobs.delete',
					getActionArgs: ({ selection }) => ({ selection }),
				},
				{
					id: 'view',
					action: createAction(jest.fn(), {
						scope: 'crossTab',
						bridged: true,
					}),
					label: 'View',
					supportsBulk: true,
					getActionArgs: ({ selection }) => ({ selection }),
				},
			],
		});

		renderWithProvider(
			<ResourceDataView resource={resource} config={config} />,
			runtime
		);

		await act(async () => {
			await Promise.resolve();
		});

		const props = getLastDataViewsProps();
		expect(props.actions).toHaveLength(2);
		expect(props.actions?.[0]?.disabled).toBe(false);
		expect(props.actions?.[1]?.disabled).toBe(false);
	});
});
