import type { Reporter, ReporterLevel } from '@wpkernel/core/reporter/types';

export interface MemoryReporterEntry {
	readonly level: ReporterLevel;
	readonly message: string;
	readonly namespace: string;
	readonly context?: unknown;
}

export interface MemoryReporter {
	readonly reporter: Reporter;
	readonly namespace: string;
	readonly entries: MemoryReporterEntry[];
	clear: () => void;
}

function createReporterForNamespace(
	namespace: string,
	entries: MemoryReporterEntry[]
): Reporter {
	const record = (
		level: ReporterLevel,
		message: string,
		context?: unknown
	) => {
		entries.push({ level, message, namespace, context });
	};

	return {
		info(message, context) {
			record('info', message, context);
		},
		warn(message, context) {
			record('warn', message, context);
		},
		error(message, context) {
			record('error', message, context);
		},
		debug(message, context) {
			record('debug', message, context);
		},
		child(childNamespace: string) {
			return createReporterForNamespace(
				`${namespace}.${childNamespace}`,
				entries
			);
		},
	} satisfies Reporter;
}

export function createMemoryReporter(namespace = 'tests'): MemoryReporter {
	const entries: MemoryReporterEntry[] = [];
	const reporter = createReporterForNamespace(namespace, entries);

	return {
		reporter,
		namespace,
		entries,
		clear() {
			entries.length = 0;
		},
	};
}
