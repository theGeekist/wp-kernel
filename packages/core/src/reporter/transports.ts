import { LoggerlessTransport } from '@loglayer/transport';
import type {
	LogLayerTransport,
	LogLayerTransportParams,
} from '@loglayer/transport';
import type { LogLevelType } from '@loglayer/shared';
import type {
	ReporterChannel,
	ReporterLevel,
	ReporterLogMetadata,
} from './types';
import { WPK_NAMESPACE, WPKernelError } from '../contracts/index.js';

/**
 * @fileoverview Reporter transports for LogLayer integration.
 *
 * This module provides browser-safe transports and building blocks for creating reporters.
 * CLI packages can extend these by adding their own Node.js-specific transports.
 */

function isReporterLevel(level: LogLevelType): level is ReporterLevel {
	return (
		level === 'debug' ||
		level === 'info' ||
		level === 'warn' ||
		level === 'error'
	);
}

function resolveNamespace(
	context: Record<string, unknown> | undefined
): string {
	const candidate = context?.namespace;
	return typeof candidate === 'string' && candidate.length > 0
		? candidate
		: WPK_NAMESPACE;
}

function parseMetadata(
	params: LogLayerTransportParams
): ReporterLogMetadata | null {
	if (!isReporterLevel(params.logLevel)) {
		return null;
	}

	const namespace = resolveNamespace(
		(params.context as Record<string, unknown> | undefined) ?? undefined
	);
	const [message] = params.messages as [string?, ...unknown[]];
	if (typeof message !== 'string') {
		return null;
	}

	const metadata = params.metadata as { context?: unknown } | undefined;

	return {
		namespace,
		level: params.logLevel,
		message,
		context: metadata?.context,
		timestamp: Date.now(),
	};
}

type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	if (!wp?.hooks || typeof wp.hooks.doAction !== 'function') {
		return null;
	}

	return wp.hooks;
}

function getConsoleMethod(level: ReporterLevel) {
	switch (level) {
		case 'error':
			return console.error.bind(console);
		case 'warn':
			return console.warn.bind(console);
		case 'debug':
			return console.debug.bind(console);
		case 'info':
		default:
			return console.info.bind(console);
	}
}

/**
 * Console transport for browser and test environments.
 * Outputs logs in a simple, structured format: `["[namespace]", "message", context]`
 *
 * @category Reporter
 */
export class ConsoleTransport extends LoggerlessTransport {
	private readonly enabledByEnvironment: boolean;

	public constructor(level: LogLevelType) {
		const environmentEnabled = resolveEnvironmentEnabled();
		super({
			id: 'console',
			level,
			enabled: environmentEnabled,
		});

		this.enabledByEnvironment = environmentEnabled;
	}

	public override shipToLogger(params: LogLayerTransportParams): unknown[] {
		if (!this.enabledByEnvironment) {
			return [];
		}

		const entry = parseMetadata(params);
		if (!entry) {
			return [];
		}

		const emit = getConsoleMethod(entry.level);
		const args: unknown[] = [`[${entry.namespace}]`, entry.message];
		if (typeof entry.context !== 'undefined') {
			args.push(entry.context);
		}

		emit(...args);
		return args;
	}
}

export class WPKernelHooksTransport extends LoggerlessTransport {
	public constructor(level: LogLevelType) {
		super({ id: 'wpkernel-hooks', level, enabled: true });
	}

	public override shipToLogger(params: LogLayerTransportParams): unknown[] {
		const entry = parseMetadata(params);
		if (!entry) {
			return [];
		}

		const hooks = getHooks();
		if (!hooks?.doAction) {
			return [];
		}

		const payload = {
			message: entry.message,
			context: entry.context,
			timestamp: entry.timestamp,
		};
		hooks.doAction(`${entry.namespace}.reporter.${entry.level}`, payload);
		return [payload];
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
 * Create transports for browser/WordPress environments.
 * CLI packages should construct their own transports using SimplePrettyTerminalTransport.
 *
 * @param    channel - Reporter channel ('console', 'hooks', 'all')
 * @param    level   - Log level
 * @return Transport or array of transports
 * @category Reporter
 */
export function createTransports(
	channel: ReporterChannel,
	level: LogLevelType
): LogLayerTransport | LogLayerTransport[] {
	switch (channel) {
		case 'console':
			return new ConsoleTransport(level);
		case 'hooks':
			return new WPKernelHooksTransport(level);

		case 'all':
			return [
				new ConsoleTransport(level),
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
			return new ConsoleTransport(level);
	}
}
