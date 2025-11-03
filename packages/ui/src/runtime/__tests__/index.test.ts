import * as runtime from '../index';
import { attachUIBindings } from '../attachUIBindings';
import { WPKernelUIProvider, useWPKernelUI } from '../context';

describe('runtime index exports', () => {
	it('re-exports runtime helpers and providers', () => {
		expect(runtime.attachUIBindings).toBe(attachUIBindings);
		expect(runtime.WPKernelUIProvider).toBe(WPKernelUIProvider);
		expect(runtime.useWPKernelUI).toBe(useWPKernelUI);
	});
});
