/**
 * Re-export shim for wpk.config.ts
 *
 * The authoritative kernel config has been moved to the repository root
 * (../../../wpk.config.ts). To keep the `examples/showcase` TypeScript
 * project happy (which has `rootDir: ./src`) we provide a tiny
 * re-export that forwards to the real file. This keeps authoring at the
 * repo root while keeping per-package builds and editors working.
 */
export {
	wpkConfig,
	jobCreationFields,
	jobCreationForm,
	jobDataViewsConfig,
} from '../wpk.config';

// Re-export commonly used types so downstream imports remain inside `src`
export type { Job, JobListParams, ShowcaseWPKernelConfig } from '../wpk.config';
