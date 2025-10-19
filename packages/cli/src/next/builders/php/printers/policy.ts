import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpPolicyHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.policy',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			options.reporter.debug(
				'createPhpPolicyHelper: placeholder – no policy AST emitted.',
				{
					policies: options.input.ir?.policies.length ?? 0,
					pending: channel.pending().length,
				}
			);

			await next?.();
		},
	});
}
