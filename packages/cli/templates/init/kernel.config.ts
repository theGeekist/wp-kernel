import type { KernelConfigV1 } from '@geekist/wp-kernel-cli/config';

/**
 * Kernel configuration for your project.
 * @see https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety
 */
export const kernelConfig: KernelConfigV1 = {
	version: 1,
	namespace: '__WPK_NAMESPACE__',
	schemas: {},
	resources: {},
};

export type KernelConfig = typeof kernelConfig;
