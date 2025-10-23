// Duplicated CLI builder channel architecture for standalone operation
// This will be removed when Channel system moves to @wpkernel/core

import type { PipelineContext } from './programBuilder';
import type { PhpProgram } from './nodes';
import type { PhpFileMetadata } from './types';

const PHP_CHANNEL_SYMBOL = Symbol('@wpkernel/php-json-ast/builder-channel');

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

export function getPhpBuilderChannel<TContext extends PipelineContext>(
	context: TContext
): PhpBuilderChannel {
	const host = context as unknown as ChannelHost;
	if (!host[PHP_CHANNEL_SYMBOL]) {
		host[PHP_CHANNEL_SYMBOL] = createChannel();
	}
	return host[PHP_CHANNEL_SYMBOL]!;
}

export function resetPhpBuilderChannel<TContext extends PipelineContext>(
	context: TContext
): void {
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
