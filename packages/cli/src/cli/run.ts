/**
 * CLI runtime entry point
 *
 * This module wires up the available commands and provides `runCli`, a
 * programmatic entry point suitable for tests and embedding the CLI in
 * other scripts.
 */
import { Cli, Command } from 'clipanion';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { CLI_HELP } from './help';

import {
	buildApplyCommand,
	buildCreateCommand,
	buildDoctorCommand,
	buildGenerateCommand,
	buildInitCommand,
	buildStartCommand,
} from '../commands';
import { VERSION } from '../version';

const CODE_COLOR = '\u001b[36m';
const CODE_RESET = '\u001b[39m';

class RootCommand extends Command {
	static override paths = [Command.Default];

	static override usage = Command.Usage({
		description: CLI_HELP.description,
		details: CLI_HELP.details,
		examples: CLI_HELP.examples,
	});

	override async execute(): Promise<number | void> {
		this.context.stdout.write(
			`WPKernel CLI v${VERSION}\nUse \"${WPK_NAMESPACE} --help\" to list commands.\n`
		);
		return undefined;
	}
}

type UsageCommandParam = Parameters<Cli['usage']>[0];

function isRootCommandTarget(command: UsageCommandParam): boolean {
	if (command === null) {
		return false;
	}
	if (command instanceof Command) {
		return command instanceof RootCommand;
	}
	return command === RootCommand;
}

class WpkCli extends Cli {
	public override usage(
		command: UsageCommandParam = null,
		options: Parameters<Cli['usage']>[1] = {}
	): string {
		let output = super.usage(command, options);
		if (options?.detailed) {
			output = output.replace(
				/\n\n(?=(?:\u001b\[[0-9;]*m)*[\t ]*(?:[•-]|\d+\.))/g,
				'\n'
			);
		}
		const expandRootUsage =
			Boolean(options?.detailed) && isRootCommandTarget(command);
		let rootUsageExpanded = false;
		return output.replace(
			/(\u001b\[1m\$\s*\u001b\[22m)([^\n]+)/g,
			(_, prefix: string, commandLine: string) => {
				const trimmed = commandLine.trimEnd();
				const trailingWhitespace = commandLine.slice(trimmed.length);
				const normalized =
					expandRootUsage && !rootUsageExpanded && trimmed === 'wpk'
						? ((rootUsageExpanded = true),
							'wpk <command> [options]')
						: trimmed;
				const highlighted = `${CODE_COLOR}\`${normalized}\`${CODE_RESET}`;
				return `${prefix}${highlighted}${trailingWhitespace}`;
			}
		);
	}
}

const cli = new WpkCli({
	binaryName: WPK_NAMESPACE,
	binaryLabel: 'WPKernel CLI',
	binaryVersion: VERSION,
});

class VersionCommand extends Command {
	static override paths = [['--version'], ['-v']];

	override async execute(): Promise<number | void> {
		this.context.stdout.write(`wpk ${VERSION}\n`);
		return undefined;
	}
}

const GenerateCommand = buildGenerateCommand();
const InitCommand = buildInitCommand();
const CreateCommand = buildCreateCommand();
const DoctorCommand = buildDoctorCommand();
const StartCommand = buildStartCommand();
const ApplyCommand = buildApplyCommand();

cli.register(RootCommand);
cli.register(VersionCommand);
cli.register(GenerateCommand);
cli.register(InitCommand);
cli.register(CreateCommand);
cli.register(DoctorCommand);
cli.register(StartCommand);
cli.register(ApplyCommand);

/**
 * Run the WPKernel CLI programmatically.
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
