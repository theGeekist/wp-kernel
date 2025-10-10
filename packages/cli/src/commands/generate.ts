import { Command, Option } from 'clipanion';

/**
 * `wpk generate` command - scaffolds artifacts.
 *
 * Placeholder implementation. When implemented this command will create
 * resources, actions and other project artifacts from templates. The
 * current stub emits helpful usage examples for contributors.
 */
export class GenerateCommand extends Command {
	static override paths = [['generate']];

	static override usage = Command.Usage({
		description:
			'Generate WP Kernel artifacts (placeholder - implementation pending).',
		examples: [
			['Generate a resource', 'wpk generate resource Job'],
			[
				'Dry run without writing files',
				'wpk generate action Submit --dry-run',
			],
		],
	});

	type = Option.String();
	name = Option.String();
	dryRun = Option.Boolean('--dry-run', false);

	override async execute(): Promise<number | void> {
		this.context.stdout.write(
			`[wpk] generate(${this.type}, ${this.name}) :: stub\n`
		);
		if (this.dryRun) {
			this.context.stdout.write('[wpk] dry run - no files created\n');
		}
		return undefined;
	}
}
