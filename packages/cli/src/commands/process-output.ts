import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';

export function forwardProcessOutput({
	child,
	reporter,
	label,
}: {
	child: ChildProcessWithoutNullStreams;
	reporter: Reporter;
	label: string;
}): void {
	const logChunk = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
		const message = chunk.toString('utf8');
		const lines = message.split(/\r?\n/);

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			const payload = { stream, line } as const;
			if (stream === 'stdout') {
				reporter.info(`${label} output.`, payload);
			} else {
				reporter.warn(`${label} output.`, payload);
			}
		}
	};

	child.stdout.on('data', (chunk: Buffer) => {
		logChunk(chunk, 'stdout');
	});

	child.stderr.on('data', (chunk: Buffer) => {
		logChunk(chunk, 'stderr');
	});
}
