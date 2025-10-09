import type { Reporter } from './types';

let kernelReporter: Reporter | undefined;

export function setKernelReporter(reporter: Reporter | undefined): void {
	kernelReporter = reporter;
}

export function getKernelReporter(): Reporter | undefined {
	return kernelReporter;
}

export function clearKernelReporter(): void {
	kernelReporter = undefined;
}
