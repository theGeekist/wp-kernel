import { Command } from 'clipanion';

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
