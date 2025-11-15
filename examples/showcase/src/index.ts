import { configureWPKernel } from '@wpkernel/core/data';
import type { WPKInstance } from '@wpkernel/core/data';
import { wpkConfig } from '../wpk.config';
import { registerGeneratedBlocks } from './blocks/auto-register';

/**
 * Bootstrap the WPKernel runtime for this project.
 *
 * This is the main entry point for your plugin's JavaScript.
 * It is responsible for initializing the WPKernel runtime and
 * registering your plugin's resources and actions.
 *
 * @see https://github.com/wpkernel/wpkernel/blob/main/docs/guide/data.md
 */
export function bootstrapKernel(): WPKInstance {
	return configureWPKernel({
		/**
		 * The namespace for your plugin. This is used to scope all
		 * of your plugin's data and actions.
		 */
		namespace: wpkConfig.namespace,
	});
}

/**
 * The WPKernel instance for your plugin.
 *
 * This is the main object that you will use to interact with the
 * WPKernel runtime. It provides access to all of the core
 * functionality, such as defining resources, invoking actions,
 * and accessing data.
 *
 * @see https://github.com/wpkernel/wpkernel/blob/main/docs/guide/data.md
 */
export const wpk = bootstrapKernel();

registerGeneratedBlocks();
