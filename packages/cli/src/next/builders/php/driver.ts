import {
	createPhpDriverInstaller as createSharedPhpDriverInstaller,
	type PhpDriverInstallLogger,
} from '@wpkernel/php-driver';
import { createHelper } from '../../helper';
import type { BuilderHelper } from '../../runtime/types';

export function createPhpDriverInstaller(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.driver',
		kind: 'builder',
		async apply({ context, reporter }) {
			const installer = createSharedPhpDriverInstaller();

			const logger: PhpDriverInstallLogger = {
				info(message: string, details?: unknown) {
					if (typeof details === 'undefined') {
						reporter.info(message);
						return;
					}

					reporter.info(message, details);
				},
				debug(message: string, details?: unknown) {
					if (typeof details === 'undefined') {
						reporter.debug(message);
						return;
					}

					reporter.debug(message, details);
				},
				error(message: string, details?: unknown) {
					if (typeof details === 'undefined') {
						reporter.error(message);
						return;
					}

					reporter.error(message, details);
				},
			};

			await installer.install({
				workspace: context.workspace,
				logger,
			});
		},
	});
}
