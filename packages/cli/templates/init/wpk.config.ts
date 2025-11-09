import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

/**
 * WPKernel configuration for your project.
 *
 * This file is the single source of truth for all code generation,
 * resource management, and plugin metadata.
 *
 * @see https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules
 */
export const wpkConfig: WPKernelConfigV1 = {
	/**
	 * The configuration version. This is used to ensure that the
	 * configuration is compatible with the version of the CLI.
	 *
	 * @see https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules
	 */
	version: 1,
	/**
	 * The root namespace for your plugin. This is used to generate
	 * the PHP namespace for your plugin's code.
	 *
	 * For example, if you set this to 'MyPlugin', the generated
	 * PHP namespace will be 'MyPlugin\'.
	 *
	 * @example
	 * namespace: 'MyPlugin',
	 *
	 * @see https://www.php-fig.org/psr/psr-4/
	 */
	namespace: '__WPK_NAMESPACE__',
	/**
	 * Schemas are used to define the shape of your data. They are
	 * used to generate the database tables and to validate data
	 * that is sent to the server.
	 *
	 * @example
	 * schemas: {
	 *   Book: {
	 *     title: 'string',
	 *     author: 'string',
	 *   },
	 * },
	 *
	 * @see https://github.com/wpkernel/wpkernel/blob/main/docs/guide/data.md
	 */
	schemas: {},
	/**
	 * @example
	 * resources: {
	 *   Book: {
	 *     schema: 'Book',
	 *     rest: true,
	 *   },
	 * },
	 */
	resources: {},
};

export type WPKernelConfig = typeof wpkConfig;
