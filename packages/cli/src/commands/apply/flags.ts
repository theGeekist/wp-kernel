import type { ApplyFlags } from './types';

export function resolveFlags(command: {
	readonly yes?: boolean;
	readonly backup?: boolean;
	readonly force?: boolean;
	readonly cleanup?: readonly string[];
	readonly allowDirty?: boolean;
}): ApplyFlags {
	return {
		yes: command.yes === true,
		backup: command.backup === true,
		force: command.force === true,
		cleanup: Array.isArray(command.cleanup)
			? command.cleanup.filter((value) => typeof value === 'string')
			: [],
		allowDirty: command.allowDirty === true,
	};
}
