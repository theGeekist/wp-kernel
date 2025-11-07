import type { CliTranscript, CliCommandOptions } from '../integration/types.js';
import { createCliRunner } from '../integration/cli-runner.js';

/**
 * Options for executing a Node.js snippet through the CLI runner.
 *
 * @category Test Support
 */
export interface RunNodeSnippetOptions extends CliCommandOptions {
	args?: string[];
	script: string;
}

/**
 * Execute a JavaScript snippet using the shared CLI runner harness.
 *
 * @param    options
 * @category Test Support
 */
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
