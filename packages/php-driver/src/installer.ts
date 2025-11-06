import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper, type Helper } from '@wpkernel/pipeline';
import type { Reporter } from '@wpkernel/core/reporter';
import type { DriverWorkspace } from './types';

const REQUIRED_PACKAGE = 'nikic/php-parser';
const VENDOR_AUTOLOAD = 'vendor/autoload.php';
const COMPOSER_MANIFEST = 'composer.json';

const execFileAsync = promisify(execFile);

export interface DriverContext {
	readonly workspace: DriverWorkspace;
}

export type DriverHelper = Helper<
	DriverContext,
	unknown,
	unknown,
	Reporter,
	'builder'
>;

type DriverApplyOptions = Parameters<DriverHelper['apply']>[0];

export function createPhpDriverInstaller(): DriverHelper {
	return createHelper<DriverContext, unknown, unknown, Reporter, 'builder'>({
		key: 'builder.generate.php.driver',
		kind: 'builder',
		async apply({ context, reporter }: DriverApplyOptions) {
			const { workspace } = context;
			const composerManifestPath = workspace.resolve(COMPOSER_MANIFEST);
			const hasComposerManifest =
				await workspace.exists(composerManifestPath);

			if (!hasComposerManifest) {
				reporter.debug(
					'createPhpDriverInstaller: composer.json missing, skipping installer.'
				);
				return;
			}

			const vendorAutoloadPath = workspace.resolve(VENDOR_AUTOLOAD);
			const hasVendorAutoload =
				await workspace.exists(vendorAutoloadPath);

			if (!hasVendorAutoload) {
				reporter.info(
					`Installing ${REQUIRED_PACKAGE} via composer (composer install).`
				);

				try {
					await execFileAsync('composer', ['install'], {
						cwd: workspace.root,
					});
					reporter.info(
						`${REQUIRED_PACKAGE} installed successfully.`
					);
				} catch (error) {
					reporter.error(
						`Composer install failed while fetching ${REQUIRED_PACKAGE}.`,
						{ error }
					);
					throw new WPKernelError('DeveloperError', {
						message: 'Composer install failed.',
						data:
							error instanceof Error
								? { message: error.message }
								: undefined,
					});
				}
				return;
			}

			reporter.debug('PHP parser dependency detected via composer.');
		},
	});
}
