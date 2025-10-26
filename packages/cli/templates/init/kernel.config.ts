import type { KernelConfigV1 } from '@wpkernel/cli/config';

/**
 * Kernel configuration for your project.
 * @see https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules
 */
export const kernelConfig: KernelConfigV1 = {
	version: 1,
	namespace: '__WPK_NAMESPACE__',
	schemas: {},
	resources: {},
};

export type KernelConfig = typeof kernelConfig;
