import { Command, Option } from 'clipanion';
import type { GenerateCommand as LegacyGenerateCommand } from '../../commands/generate';
import {
	adoptCommandEnvironment,
	createLegacyCommandLoader,
	type LegacyCommandConstructor,
} from './internal/delegate';

export interface CreateGenerateCommandOptions {
	readonly command?: LegacyCommandConstructor<LegacyGenerateCommand>;
	readonly loadCommand?: () => Promise<
		LegacyCommandConstructor<LegacyGenerateCommand>
	>;
}

type GenerateConstructor = LegacyCommandConstructor<LegacyGenerateCommand>;
type LegacyGenerateInstance = InstanceType<GenerateConstructor>;

async function defaultLoadCommand(): Promise<GenerateConstructor> {
	const module = await import('../../commands/generate');
	return module.GenerateCommand;
}

export function createGenerateCommand(
	options: CreateGenerateCommandOptions = {}
): GenerateConstructor {
	const load = createLegacyCommandLoader({
		command: options.command,
		loadCommand: options.loadCommand,
		defaultLoad: defaultLoadCommand,
	});

	class NextGenerateCommand extends Command {
		static override paths = [['generate']];

		static override usage = Command.Usage({
			description: 'Generate WP Kernel artifacts from kernel.config.*.',
			examples: [
				['Generate artifacts into .generated/', 'wpk generate'],
				[
					'Preview changes without writing files',
					'wpk generate --dry-run',
				],
				[
					'Verbose logging including per-file status',
					'wpk generate --verbose',
				],
			],
		});

		dryRun = Option.Boolean('--dry-run', false);
		verbose = Option.Boolean('--verbose', false);

		public summary?: LegacyGenerateInstance['summary'];

		override async execute(): Promise<number> {
			const Constructor = await load();
			const delegate = new Constructor();

			adoptCommandEnvironment(this, delegate);
			(delegate as { dryRun?: boolean }).dryRun = this.dryRun;
			(delegate as { verbose?: boolean }).verbose = this.verbose;

			const result = await delegate.execute();
			this.summary = (delegate as LegacyGenerateInstance).summary;
			return typeof result === 'number' ? result : 0;
		}
	}

	return NextGenerateCommand as unknown as GenerateConstructor;
}
