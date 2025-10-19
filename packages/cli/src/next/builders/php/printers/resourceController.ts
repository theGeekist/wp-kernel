import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpResourceControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpResourceControllerHelper: placeholder – awaiting AST factories.',
				{
					resources: options.input.ir?.resources.length ?? 0,
					pending: channel.pending().length,
				}
			);

			await next?.();
		},
	});
}
