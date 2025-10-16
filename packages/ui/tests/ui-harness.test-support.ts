import { KernelUIProvider } from '@wpkernel/ui';
import {
	createKernelUITestHarness as createSharedKernelUITestHarness,
	type KernelUITestHarness,
	type KernelUITestHarnessOptions,
} from '@wpkernel/test-utils/ui';

export type { KernelUITestHarness, KernelUITestHarnessOptions };

export function createKernelUITestHarness(
	options: KernelUITestHarnessOptions = {}
): KernelUITestHarness {
	return createSharedKernelUITestHarness({
		...options,
		provider: options.provider ?? KernelUIProvider,
	});
}
