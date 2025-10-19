import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { resetPhpBuilderChannel } from './channel';

export function createPhpChannelHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.channel.bootstrap',
		kind: 'builder',
		async apply(options, next) {
			resetPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpChannelHelper: channel reset for PHP pipeline.'
			);

			await next?.();
		},
	});
}
