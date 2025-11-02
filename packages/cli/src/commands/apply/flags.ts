import type { ApplyFlags } from './types';

export function resolveFlags(command: {
	readonly yes?: boolean;
	readonly backup?: boolean;
	readonly force?: boolean;
}): ApplyFlags {
	return {
		yes: command.yes === true,
		backup: command.backup === true,
		force: command.force === true,
	};
}
