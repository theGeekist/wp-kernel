import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

/**
 * WP Kernel configuration for your project.
 * @see https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/docs/cli-migration-phases.md#authoring-safety-lint-rules
 */
export const wpkConfig: WPKernelConfigV1 = {
	version: 1,
	namespace: '__WPK_NAMESPACE__',
	schemas: {},
	resources: {},
};

export type WPKernelConfig = typeof wpkConfig;
