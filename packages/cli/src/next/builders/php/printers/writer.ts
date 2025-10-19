import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { getPhpBuilderChannel } from './channel';

export function createPhpProgramWriterHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.writer',
		kind: 'builder',
		async apply(options, next) {
			const channel = getPhpBuilderChannel(options.context);
			const queued = channel.pending().length;

			if (queued > 0) {
				options.reporter.debug(
					'createPhpProgramWriterHelper: placeholder writer would flush queued programs.',
					{ pending: queued }
				);
			} else {
				options.reporter.debug(
					'createPhpProgramWriterHelper: no programs queued.'
				);
			}

			channel.reset();
			await next?.();
		},
	});
}
