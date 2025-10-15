/**
 * Re-export shim for kernel.config.ts
 *
 * The authoritative kernel config has been moved to the repository root
 * (../../../kernel.config.ts). To keep the `examples/showcase` TypeScript
 * project happy (which has `rootDir: ./src`) we provide a tiny
 * re-export that forwards to the real file. This keeps authoring at the
 * repo root while keeping per-package builds and editors working.
 */
export { kernelConfig, jobDataViewsConfig } from '../kernel.config';

// Re-export commonly used types so downstream imports remain inside `src`
export type {
	Job,
	JobListParams,
	ShowcaseKernelConfig,
} from '../kernel.config';
