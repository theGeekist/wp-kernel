/**
 * CLI-specific reporter implementation.
 *
 * This module extends the core reporter with Node.js-specific transports like
 * SimplePrettyTerminalTransport for enhanced CLI output formatting.
 *
 * @module
 */

import { LogLayer, type LogLevelType, type LogLayerTransport } from 'loglayer';
import { SimplePrettyTerminalTransport } from '@loglayer/transport-simple-pretty-terminal';
import { WPKernelHooksTransport } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	Reporter,
	ReporterOptions,
	ReporterLevel,
	ReporterChannel,
} from '@wpkernel/core/reporter';

const DEFAULT_NAMESPACE = WPK_NAMESPACE;
const DEFAULT_CHANNEL: ReporterChannel = 'console';
const DEFAULT_LEVEL: ReporterLevel = 'info';

function mapLevelToLogLevel(level: ReporterLevel): LogLevelType {
	switch (level) {
		case 'debug':
			return 'debug';
		case 'warn':
			return 'warn';
		case 'error':
			return 'error';
		case 'info':
		default:
			return 'info';
	}
}

function resolveEnvironmentEnabled(): boolean {
	if (typeof process === 'undefined' || !process.env) {
		return true;
	}

	const env = process.env?.NODE_ENV;
	if (!env) {
		return true;
	}

	return env !== 'production';
}

/**
 * Create CLI-specific transports with pretty terminal formatting.
 *
 * @param channel - Reporter channel
 * @param level   - Log level
 * @return Transport or array of transports
 */
function createCLITransports(
	channel: ReporterChannel,
	level: LogLevelType
): LogLayerTransport | LogLayerTransport[] {
	const environmentEnabled = resolveEnvironmentEnabled();

	switch (channel) {
		case 'console':
			return new SimplePrettyTerminalTransport({
				runtime: 'node',
				level,
				enabled: environmentEnabled,
			});
		case 'hooks':
			return new WPKernelHooksTransport(level);

		case 'all':
			return [
				new SimplePrettyTerminalTransport({
					runtime: 'node',
					level,
					enabled: environmentEnabled,
				}),
				new WPKernelHooksTransport(level),
			];
		case 'bridge':
			throw new WPKernelError('NotImplementedError', {
				message: 'Bridge transport is planned for a future sprint',
				context: {
					channel: 'bridge',
				},
			});

		default:
			return new SimplePrettyTerminalTransport({
				runtime: 'node',
				level,
				enabled: environmentEnabled,
			});
	}
}

function logWithLevel(
	logger: LogLayer,
	level: ReporterLevel,
	message: string,
	context?: unknown
): void {
	const target =
		typeof context === 'undefined'
			? logger
			: logger.withMetadata({ context });

	switch (level) {
		case 'debug':
			target.debug(message);
			break;
		case 'warn':
			target.warn(message);
			break;
		case 'error':
			target.error(message);
			break;
		case 'info':
		default:
			target.info(message);
			break;
	}
}

/**
 * Create a CLI reporter with pretty terminal output.
 *
 * This is the recommended reporter for CLI/Node.js environments. It uses
 * SimplePrettyTerminalTransport for enhanced formatting with colors and structure.
 *
 * For browser/WordPress environments, use `createReporter()` from `@wpkernel/core`.
 *
 * @param    options - Reporter configuration
 * @return Reporter instance with child helpers
 * @category Reporter
 * @example
 * ```typescript
 * import { createReporterCLI } from '@wpkernel/cli/utils/reporter';
 *
 * const reporter = createReporterCLI({ level: 'debug' });
 * reporter.info('Starting build process');
 * ```
 */
export function createReporterCLI(options: ReporterOptions = {}): Reporter {
	const namespace = options.namespace ?? DEFAULT_NAMESPACE;
	const level = options.level ?? DEFAULT_LEVEL;
	const channel = options.channel ?? DEFAULT_CHANNEL;
	const enabled = options.enabled ?? true;

	const transports = createCLITransports(channel, mapLevelToLogLevel(level));
	const logger = new LogLayer({
		transport: transports,
	});

	logger.withContext({ namespace });

	if (!enabled) {
		logger.disableLogging();
	}

	const report = (
		entryLevel: ReporterLevel,
		message: string,
		context?: unknown
	) => {
		if (!enabled) {
			return;
		}

		logWithLevel(logger, entryLevel, message, context);
	};

	const reporter: Reporter = {
		info(message, context) {
			report('info', message, context);
		},
		warn(message, context) {
			report('warn', message, context);
		},
		error(message, context) {
			report('error', message, context);
		},
		debug(message, context) {
			report('debug', message, context);
		},
		child(childNamespace) {
			return createReporterCLI({
				...options,
				namespace: `${namespace}.${childNamespace}`,
			});
		},
	};

	return reporter;
}
