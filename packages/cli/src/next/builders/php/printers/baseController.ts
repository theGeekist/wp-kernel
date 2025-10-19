import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpBaseControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.base',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpBaseControllerHelper: placeholder – no AST queued.',
				{
					pending: channel.pending().length,
					namespace: options.input.ir?.php.namespace,
				}
			);

			await next?.();
		},
	});
}
