import { Command, Option } from 'clipanion';
import type { InitCommand as LegacyInitCommand } from '../../commands/init';
import {
	adoptCommandEnvironment,
	buildLegacyCommandLoader,
	type LegacyCommandConstructor,
} from './internal/delegate';

export interface BuildInitCommandOptions {
	readonly command?: LegacyCommandConstructor<LegacyInitCommand>;
	readonly loadCommand?: () => Promise<
		LegacyCommandConstructor<LegacyInitCommand>
	>;
}

type InitConstructor = LegacyCommandConstructor<LegacyInitCommand>;

async function defaultLoadCommand(): Promise<InitConstructor> {
	const module = await import('../../commands/init');
	return module.InitCommand;
}

export function buildInitCommand(
	options: BuildInitCommandOptions = {}
): InitConstructor {
	const load = buildLegacyCommandLoader({
		command: options.command,
		loadCommand: options.loadCommand,
		defaultLoad: defaultLoadCommand,
	});

	class NextInitCommand extends Command {
		static override paths = [['init']];

		static override usage = Command.Usage({
			description:
				'Initialise a WP Kernel project by scaffolding config, entrypoint, and linting presets.',
			examples: [
				['Scaffold project files', 'wpk init --name=my-plugin'],
				['Overwrite existing files', 'wpk init --force'],
			],
		});

		name = Option.String('--name', {
			description: 'Project slug used for namespace/package defaults',
			required: false,
		});
		template = Option.String('--template', {
			description:
				'Reserved for future templates (plugin/theme/headless)',
			required: false,
		});
		force = Option.Boolean('--force', false);
		verbose = Option.Boolean('--verbose', false);
		preferRegistryVersions = Option.Boolean(
			'--prefer-registry-versions',
			false
		);

		override async execute(): Promise<number> {
			const Constructor = await load();
			const delegate = new Constructor();

			adoptCommandEnvironment(this, delegate);
			(delegate as { name?: string | undefined }).name = this.name;
			(delegate as { template?: string | undefined }).template =
				this.template;
			(delegate as { force?: boolean }).force = this.force;
			(delegate as { verbose?: boolean }).verbose = this.verbose;
			(
				delegate as {
					preferRegistryVersions?: boolean;
				}
			).preferRegistryVersions = this.preferRegistryVersions;

			const result = await delegate.execute();
			return typeof result === 'number' ? result : 0;
		}
	}

	return NextInitCommand as unknown as InitConstructor;
}
