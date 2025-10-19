import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { resetPhpBuilderChannel } from './channel';
import { resetPhpAstChannel } from '../ast/context';

export function createPhpChannelHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.channel.bootstrap',
		kind: 'builder',
		async apply(options, next) {
			resetPhpBuilderChannel(options.context);
			resetPhpAstChannel(options.context);
			options.reporter.debug(
				'createPhpChannelHelper: channels reset for PHP pipeline.'
			);

			await next?.();
		},
	});
}
