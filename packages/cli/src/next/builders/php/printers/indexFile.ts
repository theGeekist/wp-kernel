import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpIndexFileHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.index',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpIndexFileHelper: placeholder – loader map not generated.',
				{
					pending: channel.pending().length,
					namespace: options.input.ir?.php.namespace,
				}
			);

			await next?.();
		},
	});
}
