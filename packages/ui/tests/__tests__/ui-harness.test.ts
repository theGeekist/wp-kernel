import { renderHook } from '@testing-library/react';
import { WPKernelUIProvider } from '@wpkernel/ui';
import { createKernelUITestHarness } from '@wpkernel/test-utils/ui';
import {
	createIntersectionObserverMock,
	installRequestAnimationFrameMock,
} from '../dom-observer.test-support.js';

describe('@wpkernel/ui test-support helpers', () => {
	it('creates runtime and wrapper wired to the WordPress harness', () => {
		const harness = createKernelUITestHarness({
			provider: WPKernelUIProvider,
		});
		const runtime = harness.createRuntime();
		const wrapper = harness.createWrapper(runtime);

		const { result, unmount } = renderHook(() => runtime.namespace, {
			wrapper,
		});

		expect(result.current).toBe('tests');

		harness.teardown();
		unmount();
	});

	it('suppresses and restores console errors via predicate', () => {
		const harness = createKernelUITestHarness({
			provider: WPKernelUIProvider,
		});
		const spy = jest.spyOn(console, 'error');

		harness.suppressConsoleError(([message]) =>
			String(message).includes('ignore')
		);
		console.error('ignore this error');
		console.error('surface this error');
		harness.restoreConsoleError();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('surface this error');

		harness.teardown();
		spy.mockRestore();
	});

	it('provides intersection observer and raf mocks with cleanup', () => {
		const observer = createIntersectionObserverMock();
		const raf = installRequestAnimationFrameMock();

		// Instantiate an observer so the mock is invoked
		new window.IntersectionObserver(() => {});
		window.requestAnimationFrame(() => {});

		observer.trigger();
		raf.flush();

		expect(observer.mock).toHaveBeenCalled();
		expect(raf.raf).toHaveBeenCalled();

		observer.restore();
		raf.restore();
	});
});
