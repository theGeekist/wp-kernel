import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpPersistenceRegistryHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.registration.persistence',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpPersistenceRegistryHelper: placeholder – persistence metadata not yet emitted.',
				{
					resources: options.input.ir?.resources.length ?? 0,
					pending: channel.pending().length,
				}
			);

			await next?.();
		},
	});
}
