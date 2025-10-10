import { Command } from 'clipanion';

/**
 * `wpk doctor` - run quick health checks on a workspace.
 *
 * The real implementation will verify environment, composer/autoload,
 * and other common failure modes. Currently a placeholder that prints a
 * diagnostic summary when executed.
 */
export class DoctorCommand extends Command {
	static override paths = [['doctor']];

	static override usage = Command.Usage({
		description:
			'Check project setup and dependencies (placeholder - implementation pending).',
	});

	override async execute(): Promise<number | void> {
		this.context.stdout.write('[wpk] doctor :: checks coming soon\n');
		return undefined;
	}
}
