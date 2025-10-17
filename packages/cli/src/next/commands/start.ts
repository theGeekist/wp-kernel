import { Command, Option } from 'clipanion';
import type { StartCommand as LegacyStartCommand } from '../../commands/start';
import {
	adoptCommandEnvironment,
	createLegacyCommandLoader,
	type LegacyCommandConstructor,
} from './internal/delegate';

export interface CreateStartCommandOptions {
	readonly command?: LegacyCommandConstructor<LegacyStartCommand>;
	readonly loadCommand?: () => Promise<
		LegacyCommandConstructor<LegacyStartCommand>
	>;
}

type StartConstructor = LegacyCommandConstructor<LegacyStartCommand>;

async function defaultLoadCommand(): Promise<StartConstructor> {
	const module = await import('../../commands/start');
	return module.StartCommand;
}

export function createStartCommand(
	options: CreateStartCommandOptions = {}
): StartConstructor {
	const load = createLegacyCommandLoader({
		command: options.command,
		loadCommand: options.loadCommand,
		defaultLoad: defaultLoadCommand,
	});

	class NextStartCommand extends Command {
		static override paths = [['start']];

		static override usage = Command.Usage({
			description:
				'Watch kernel sources, regenerate on change, and run the Vite dev server.',
			examples: [
				['Start watch mode with default settings', 'wpk start'],
				[
					'Enable verbose logging and PHP auto-apply',
					'wpk start --verbose --auto-apply-php',
				],
			],
		});

		verbose = Option.Boolean('--verbose', false);
		autoApplyPhp = Option.Boolean('--auto-apply-php', false);

		override async execute(): Promise<number> {
			const Constructor = await load();
			const delegate = new Constructor();

			adoptCommandEnvironment(this, delegate);
			(delegate as { verbose?: boolean }).verbose = this.verbose;
			(delegate as { autoApplyPhp?: boolean }).autoApplyPhp =
				this.autoApplyPhp;

			const result = await delegate.execute();
			return typeof result === 'number' ? result : 0;
		}
	}

	return NextStartCommand as unknown as StartConstructor;
}
