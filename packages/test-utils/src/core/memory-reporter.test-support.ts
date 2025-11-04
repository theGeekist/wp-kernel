import type { Reporter, ReporterLevel } from '@wpkernel/core/reporter/types';

/**
 * Represents a single log entry in the `MemoryReporter`.
 *
 * @category Reporter
 */
export interface MemoryReporterEntry {
	/** The logging level of the entry. */
	readonly level: ReporterLevel;
	/** The log message. */
	readonly message: string;
	/** The namespace of the reporter that created the entry. */
	readonly namespace: string;
	/** Optional context associated with the log entry. */
	readonly context?: unknown;
}

/**
 * A test utility that captures reporter output in memory.
 *
 * @category Reporter
 */
export interface MemoryReporter {
	/** The reporter instance. */
	readonly reporter: Reporter;
	/** The namespace of the reporter. */
	readonly namespace: string;
	/** An array of captured log entries. */
	readonly entries: MemoryReporterEntry[];
	/** Clears all captured log entries. */
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

/**
 * Creates a `MemoryReporter` instance.
 *
 * @category Reporter
 * @param    namespace - The namespace for the reporter. Defaults to 'tests'.
 * @returns A `MemoryReporter` instance.
 */
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
