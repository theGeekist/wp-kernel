import { Command } from 'clipanion';
import { StartCommand } from './start';
import type { ExitCode } from './run-generate';

/**
 * Temporary alias preserving the legacy `wpk dev` entry point.
 */
export class DevCommand extends StartCommand {
	static override paths = [['dev']];

	static override usage = Command.Usage({
		description: 'Deprecated alias for `wpk start`.',
		details:
			'Use `wpk start` instead. The `dev` command will be removed in a future release.',
	});

	override async execute(): Promise<ExitCode> {
		this.context.stderr.write(
			'⚠️  `wpk dev` is deprecated. Use `wpk start` instead.\n'
		);

		return super.execute();
	}
}
