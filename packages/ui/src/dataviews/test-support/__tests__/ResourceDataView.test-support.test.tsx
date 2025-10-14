import { render } from '@testing-library/react';
import { KernelUIProvider } from '../../../runtime/context';
import {
	DataViewsMock,
	createKernelRuntime,
	renderWithProvider,
	getLastDataViewsProps,
} from '../ResourceDataView.test-support';

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
});
