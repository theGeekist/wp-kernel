import { Cli, Command } from 'clipanion';
import { GenerateCommand, InitCommand, DoctorCommand } from '../commands';
import { VERSION } from '../version';

class RootCommand extends Command {
	static override paths = [Command.Default];

	static override usage = Command.Usage({
		description:
			'WP Kernel CLI entry point (placeholder commands registered).',
	});

	override async execute(): Promise<number | void> {
		this.context.stdout.write(
			`WP Kernel CLI v${VERSION}\nUse \"wpk --help\" to list commands.\n`
		);
		return undefined;
	}
}

const cli = new Cli({
	binaryName: 'wpk',
	binaryLabel: 'WP Kernel CLI',
	binaryVersion: VERSION,
});

cli.register(RootCommand);
cli.register(GenerateCommand);
cli.register(InitCommand);
cli.register(DoctorCommand);

export async function runCli(
	argv: string[] = process.argv.slice(2)
): Promise<void> {
	await cli.runExit(argv, {
		stdin: process.stdin,
		stdout: process.stdout,
		stderr: process.stderr,
	});
}
