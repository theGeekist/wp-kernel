import type { PipelineContext } from '../../../runtime/types';
import type { PhpProgram } from '../ast/nodes';
import type { PhpFileMetadata } from '../ast/types';

const PHP_CHANNEL_SYMBOL = Symbol('@wpkernel/next/php/channel');

export interface PhpProgramAction {
	readonly file: string;
	readonly program: PhpProgram;
	readonly metadata: PhpFileMetadata;
	readonly docblock: readonly string[];
	readonly uses: readonly string[];
	readonly statements: readonly string[];
}

export interface PhpBuilderChannel {
	queue: (action: PhpProgramAction) => void;
	drain: () => readonly PhpProgramAction[];
	reset: () => void;
	pending: () => readonly PhpProgramAction[];
}

interface ChannelHost {
	[PHP_CHANNEL_SYMBOL]?: PhpBuilderChannel;
}

export function getPhpBuilderChannel(
	context: PipelineContext
): PhpBuilderChannel {
	const host = context as PipelineContext & ChannelHost;
	if (!host[PHP_CHANNEL_SYMBOL]) {
		host[PHP_CHANNEL_SYMBOL] = createChannel();
	}
	return host[PHP_CHANNEL_SYMBOL]!;
}

export function resetPhpBuilderChannel(context: PipelineContext): void {
	getPhpBuilderChannel(context).reset();
}

function createChannel(): PhpBuilderChannel {
	const buffer: PhpProgramAction[] = [];

	return {
		queue(action) {
			buffer.push(action);
		},
		drain() {
			const pending = [...buffer];
			buffer.length = 0;
			return pending;
		},
		reset() {
			buffer.length = 0;
		},
		pending() {
			return [...buffer];
		},
	};
}
