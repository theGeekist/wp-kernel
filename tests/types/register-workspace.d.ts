declare module '@wpkernel/scripts/register-workspace' {
	type Logger = {
		log: (message: string) => void;
		warn: (message: string) => void;
	};

	interface BaseOptions {
		workspaceInput: string;
		cwd?: string;
		logger?: Logger;
	}

	interface DependencyOptions {
		dependenciesToAdd?: readonly string[];
		dependenciesToRemove?: readonly string[];
	}

	export function createWorkspace(
		options: BaseOptions & Pick<DependencyOptions, 'dependenciesToAdd'>
	): void;

	export function updateWorkspace(
		options: BaseOptions & DependencyOptions
	): void;

	export function removeWorkspace(options: BaseOptions): void;
}
