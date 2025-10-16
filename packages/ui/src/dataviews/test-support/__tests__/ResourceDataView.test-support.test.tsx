import { render } from '@testing-library/react';
import { KernelUIProvider } from '../../../runtime/context';
import {
	DataViewsMock,
	createKernelRuntime,
	renderWithProvider,
	getLastDataViewsProps,
	renderActionScenario,
	buildActionConfig,
	flushDataViews,
	createAction,
} from '../ResourceDataView.test-support';
import { act } from 'react';

describe('ResourceDataView test support helpers', () => {
	it('persists preferences through adapter helpers', async () => {
		const runtime = createKernelRuntime();
		await runtime.dataviews.preferences.adapter.set('key', 'value');
		expect(await runtime.dataviews.preferences.adapter.get('key')).toBe(
			'value'
		);
		expect(await runtime.dataviews.preferences.get('key')).toBe('value');
		expect(runtime.dataviews.preferences.getScopeOrder()).toEqual([
			'user',
			'role',
			'site',
		]);
	});

	it('renders UI within KernelUIProvider', () => {
		const runtime = createKernelRuntime();
		const result = renderWithProvider(<div>hello</div>, runtime);
		expect(result.getByText('hello')).toBeTruthy();

		result.rerenderWithProvider(<div>world</div>);
		expect(result.getByText('world')).toBeTruthy();
	});

	it('throws when DataViews was never rendered', () => {
		DataViewsMock.mockClear();
		expect(() => getLastDataViewsProps()).toThrow(
			'DataViews was not rendered'
		);
	});

	it('captures DataViews props from mock calls', () => {
		DataViewsMock.mockClear();
		render(
			<KernelUIProvider runtime={createKernelRuntime()}>
				{DataViewsMock({
					data: [],
				})}
			</KernelUIProvider>
		);
		expect(getLastDataViewsProps()).toEqual({ data: [] });
	});

	it('exposes action entries via the renderActionScenario helper', async () => {
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const { getActionEntries } = renderActionScenario({
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		await flushDataViews();

		const [entry] = getActionEntries();
		expect(entry).toBeDefined();

		await act(async () => {
			await entry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(actionImpl).toHaveBeenCalledWith({ selection: ['1'] });
	});

	it('allows multiple actions to be provided', async () => {
		const first = buildActionConfig({ id: 'first' });
		const second = buildActionConfig({ id: 'second' });

		const { getActionEntries } = renderActionScenario({
			actions: [first, second],
		});

		await flushDataViews();

		const entries = getActionEntries();
		expect(entries).toHaveLength(2);
		expect(entries[0]).toBeDefined();
		expect(entries[1]).toBeDefined();
	});
});
