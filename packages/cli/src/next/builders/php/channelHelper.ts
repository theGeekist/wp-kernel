import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { resetPhpBuilderChannel } from './channel';
import { resetPhpAstChannel } from '@wpkernel/php-json-ast';

export function createPhpChannelHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.channel.bootstrap',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			resetPhpBuilderChannel(options.context);
			resetPhpAstChannel(options.context);
			options.reporter.debug(
				'createPhpChannelHelper: channels reset for PHP pipeline.'
			);

			await next?.();
		},
	});
}
