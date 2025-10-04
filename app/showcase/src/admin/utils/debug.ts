declare const process:
	| undefined
	| {
			env?: Record<string, string | undefined>;
	  };

type DebuggableWindow = Window &
	typeof globalThis & {
		__wpkKernelDebugLogs?: DebugEntry[];
	};

export interface DebugEntry {
	timestamp: number;
	label: string;
	details?: unknown;
}

const DEBUG_LOG_KEY = '__wpkKernelDebugLogs';

const isProduction = (): boolean => {
	const maybeProcessEnv =
		typeof process !== 'undefined' ? process?.env?.NODE_ENV : undefined;

	if (maybeProcessEnv) {
		return maybeProcessEnv === 'production';
	}

	const maybeImportMetaEnv = (
		import.meta as ImportMeta & {
			env?: { MODE?: string; NODE_ENV?: string };
		}
	).env;

	const mode = maybeImportMetaEnv?.MODE ?? maybeImportMetaEnv?.NODE_ENV;

	return mode === 'production';
};

const getDebugWindow = (): DebuggableWindow | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	return window as DebuggableWindow;
};

const appendEntry = (entry: DebugEntry): void => {
	const debugWindow = getDebugWindow();

	if (!debugWindow) {
		return;
	}

	const existing = debugWindow[DEBUG_LOG_KEY] ?? [];

	debugWindow[DEBUG_LOG_KEY] = [...existing, entry];
};

export const logDebug = (label: string, details?: unknown): void => {
	const entry: DebugEntry = {
		timestamp: Date.now(),
		label,
		details,
	};

	appendEntry(entry);

	if (!isProduction()) {
		console.log(`[${label}]`, details ?? null);
	}
};

export const clearDebugLog = (): void => {
	const debugWindow = getDebugWindow();

	if (!debugWindow) {
		return;
	}

	debugWindow[DEBUG_LOG_KEY] = [];
};

export const getDebugLog = (): DebugEntry[] => {
	const debugWindow = getDebugWindow();

	return debugWindow?.[DEBUG_LOG_KEY] ?? [];
};
