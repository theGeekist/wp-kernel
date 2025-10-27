import type { Reporter } from './types';

let kernelReporter: Reporter | undefined;

export function setWPKernelReporter(reporter: Reporter | undefined): void {
	kernelReporter = reporter;
}

export function getWPKernelReporter(): Reporter | undefined {
	return kernelReporter;
}

export function clearWPKReporter(): void {
	kernelReporter = undefined;
}
