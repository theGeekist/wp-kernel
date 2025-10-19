import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { KernelError } from '@wpkernel/core/error';
import { createHelper } from '../../helper';
import type { BuilderHelper } from '../../runtime/types';

const REQUIRED_PACKAGE = 'nikic/php-parser';
const VENDOR_AUTOLOAD = 'vendor/autoload.php';

const execFileAsync = promisify(execFile);

export function createPhpDriverInstaller(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.driver',
		kind: 'builder',
		async apply({ context, reporter }) {
			const { workspace } = context;
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
					throw new KernelError('DeveloperError', {
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
