/**
 * CLI runtime entry point
 *
 * This module wires up the available commands and provides `runCli`, a
 * programmatic entry point suitable for tests and embedding the CLI in
 * other scripts.
 */
import { Cli, Command } from 'clipanion';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import {
	GenerateCommand,
	InitCommand,
	DoctorCommand,
	StartCommand,
	BuildCommand,
	ApplyCommand,
} from '../commands';
import { VERSION } from '../version';

class RootCommand extends Command {
	static override paths = [Command.Default];

	static override usage = Command.Usage({
		description:
			'WP Kernel CLI entry point (placeholder commands registered).',
	});

	override async execute(): Promise<number | void> {
		this.context.stdout.write(
			`WP Kernel CLI v${VERSION}\nUse \"${WPK_NAMESPACE} --help\" to list commands.\n`
		);
		return undefined;
	}
}

const cli = new Cli({
	binaryName: WPK_NAMESPACE,
	binaryLabel: 'WP Kernel CLI',
	binaryVersion: VERSION,
});

cli.register(RootCommand);
cli.register(GenerateCommand);
cli.register(InitCommand);
cli.register(DoctorCommand);
cli.register(StartCommand);
cli.register(BuildCommand);
cli.register(ApplyCommand);

/**
 * Run the WP Kernel CLI programmatically.
 *
 * This convenience function mirrors the behavior of the shipped `wpk`
 * binary but is safe to call from scripts or tests. It accepts an argv
 * array (defaults to process.argv slice(2)) and forwards stdio streams to
 * the underlying Clipanion CLI instance.
 *
 * @param argv - Command-line arguments (without the node and script path)
 * @return A promise that resolves when the CLI invocation completes.
 * @example
 * ```ts
 * // programmatic invocation from a script
 * await runCli(['generate', 'resource', '--name', 'post']);
 * ```
 */
export async function runCli(
	argv: string[] = process.argv.slice(2)
): Promise<void> {
	await cli.runExit(argv, {
		stdin: process.stdin,
		stdout: process.stdout,
		stderr: process.stderr,
	});
}
