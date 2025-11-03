import type { Command } from 'clipanion';

export type LegacyCommandConstructor<T extends Command> = new () => T;

export interface LegacyCommandLoaderOptions<T extends Command> {
	readonly command?: LegacyCommandConstructor<T>;
	readonly loadCommand?: () => Promise<LegacyCommandConstructor<T>>;
	readonly defaultLoad: () => Promise<LegacyCommandConstructor<T>>;
}

export function buildLegacyCommandLoader<T extends Command>({
	command,
	loadCommand,
	defaultLoad,
}: LegacyCommandLoaderOptions<T>): () => Promise<LegacyCommandConstructor<T>> {
	let cached: LegacyCommandConstructor<T> | undefined = command;
	let loading: Promise<LegacyCommandConstructor<T>> | null = null;

	const loader = loadCommand ?? defaultLoad;

	return async () => {
		if (cached) {
			return cached;
		}

		if (!loading) {
			loading = loader().then((ctor) => {
				cached = ctor;
				return ctor;
			});
		}

		return loading;
	};
}

export function adoptCommandEnvironment(
	source: Command,
	target: Command
): void {
	const sourceFields = source as unknown as Record<string, unknown>;
	const targetFields = target as unknown as Record<string, unknown>;

	targetFields.cli = sourceFields.cli;
	targetFields.context = sourceFields.context;
	targetFields.path = sourceFields.path;
	targetFields.stdin = sourceFields.stdin;
	targetFields.stdout = sourceFields.stdout;
	targetFields.stderr = sourceFields.stderr;
}
