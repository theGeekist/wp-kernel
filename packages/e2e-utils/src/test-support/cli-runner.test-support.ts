import type { CliTranscript, CliCommandOptions } from '../integration/types.js';
import { createCliRunner } from '../integration/cli-runner.js';

export interface RunNodeSnippetOptions extends CliCommandOptions {
	args?: string[];
	script: string;
}

export async function runNodeSnippet(
	options: RunNodeSnippetOptions
): Promise<CliTranscript> {
	const runner = createCliRunner(options.env);
	return runner.run(
		{
			command: process.execPath,
			args: ['-e', options.script, ...(options.args ?? [])],
		},
		{
			cwd: options.cwd,
			env: options.env,
			stdin: options.stdin,
			timeoutMs: options.timeoutMs,
		}
	);
}
