import { createReadinessHelper } from '../helper';
import type { ReadinessDetection, ReadinessConfirmation } from '../types';
import type { DxContext } from '../../context';
import {
	initialiseGitRepository,
	isGitRepository,
	type GitDependencies,
} from '../../../commands/init/git';

export interface GitHelperDependencies {
	readonly detectRepository: typeof isGitRepository;
	readonly initRepository: typeof initialiseGitRepository;
}

export interface GitReadinessState {
	readonly root: string;
}

function resolveWorkspaceRoot(context: DxContext): string {
	return (
		context.environment.workspaceRoot ??
		context.workspace?.root ??
		context.environment.cwd
	);
}

function defaultDependencies(): GitHelperDependencies {
	return {
		detectRepository: (cwd, deps?: GitDependencies) =>
			isGitRepository(cwd, deps),
		initRepository: (cwd, deps?: GitDependencies) =>
			initialiseGitRepository(cwd, deps),
	} satisfies GitHelperDependencies;
}

export function createGitReadinessHelper(
	overrides: Partial<GitHelperDependencies> = {}
) {
	const dependencies = { ...defaultDependencies(), ...overrides };

	return createReadinessHelper<GitReadinessState>({
		key: 'git',
		async detect(context): Promise<ReadinessDetection<GitReadinessState>> {
			const root = resolveWorkspaceRoot(context);
			const isRepo = await dependencies.detectRepository(root);

			if (isRepo) {
				return {
					status: 'ready',
					state: { root },
					message: 'Git repository detected.',
				};
			}

			return {
				status: 'pending',
				state: { root },
				message: 'Initialise git repository.',
			};
		},
		async execute(_context, state) {
			await dependencies.initRepository(state.root);
			return { state };
		},
		async confirm(
			_context,
			state
		): Promise<ReadinessConfirmation<GitReadinessState>> {
			const isRepo = await dependencies.detectRepository(state.root);

			return {
				status: isRepo ? 'ready' : 'pending',
				state,
				message: isRepo
					? 'Git repository ready.'
					: 'Git repository missing.',
			};
		},
	});
}
