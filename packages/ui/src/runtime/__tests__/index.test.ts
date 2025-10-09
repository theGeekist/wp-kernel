import * as runtime from '../index';
import { attachUIBindings } from '../attachUIBindings';
import { KernelUIProvider, useKernelUI } from '../context';

describe('runtime index exports', () => {
	it('re-exports runtime helpers and providers', () => {
		expect(runtime.attachUIBindings).toBe(attachUIBindings);
		expect(runtime.KernelUIProvider).toBe(KernelUIProvider);
		expect(runtime.useKernelUI).toBe(useKernelUI);
	});
});
