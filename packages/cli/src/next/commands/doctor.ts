import { Command } from 'clipanion';
import type { DoctorCommand as LegacyDoctorCommand } from '../../commands/doctor';
import {
	adoptCommandEnvironment,
	buildLegacyCommandLoader,
	type LegacyCommandConstructor,
} from './internal/delegate';

export interface BuildDoctorCommandOptions {
	readonly command?: LegacyCommandConstructor<LegacyDoctorCommand>;
	readonly loadCommand?: () => Promise<
		LegacyCommandConstructor<LegacyDoctorCommand>
	>;
}

type DoctorConstructor = LegacyCommandConstructor<LegacyDoctorCommand>;

async function defaultLoadCommand(): Promise<DoctorConstructor> {
	const module = await import('../../commands/doctor');
	return module.DoctorCommand;
}

export function buildDoctorCommand(
	options: BuildDoctorCommandOptions = {}
): DoctorConstructor {
	const load = buildLegacyCommandLoader({
		command: options.command,
		loadCommand: options.loadCommand,
		defaultLoad: defaultLoadCommand,
	});

	class NextDoctorCommand extends Command {
		static override paths = [['doctor']];

		static override usage = Command.Usage({
			description:
				'Check project setup and dependencies (placeholder - implementation pending).',
		});

		override async execute(): Promise<number | void> {
			const Constructor = await load();
			const delegate = new Constructor();
			adoptCommandEnvironment(this, delegate);
			return delegate.execute();
		}
	}

	return NextDoctorCommand as unknown as DoctorConstructor;
}
