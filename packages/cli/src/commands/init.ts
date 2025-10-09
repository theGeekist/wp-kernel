import { Command, Option } from 'clipanion';

export class InitCommand extends Command {
	static override paths = [['init']];

	static override usage = Command.Usage({
		description:
			'Initialise a WP Kernel project (placeholder - implementation pending).',
	});

	name = Option.String('--name', {
		description: 'Project name',
		required: false,
	});

	template = Option.String('--template', {
		description: 'Template to use',
		required: false,
	});

	override async execute(): Promise<number | void> {
		const projectName = this.name ?? 'wp-kernel-project';
		const template = this.template ?? 'default';
		this.context.stdout.write(
			`[wpk] init(${projectName}) using template "${template}" :: stub\n`
		);
		return undefined;
	}
}
