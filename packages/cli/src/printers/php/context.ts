import { createNoopReporter } from '@geekist/wp-kernel/reporter';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import type { AdapterContext } from '../../config/types';
import type { PrinterContext } from '../types';

export function ensureAdapterContext(
	context: PrinterContext
): AdapterContext & { ir: PrinterContext['ir'] } {
	if (context.adapterContext) {
		const adapterContext: AdapterContext & {
			ir: PrinterContext['ir'];
		} = {
			...context.adapterContext,
			config: context.adapterContext.config ?? context.ir.config,
			reporter: isReporter(context.adapterContext.reporter)
				? context.adapterContext.reporter
				: createNoopReporter(),
			namespace:
				context.adapterContext.namespace ??
				context.ir.meta.sanitizedNamespace,
			ir: context.adapterContext.ir ?? context.ir,
		};

		context.adapterContext = adapterContext;

		return adapterContext;
	}

	const adapterContext: AdapterContext & {
		ir: PrinterContext['ir'];
	} = {
		config: context.ir.config,
		reporter: createNoopReporter(),
		namespace: context.ir.meta.sanitizedNamespace,
		ir: context.ir,
	};

	context.adapterContext = adapterContext;

	return adapterContext;
}

function isReporter(value: unknown): value is Reporter {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.info === 'function' &&
		typeof candidate.warn === 'function' &&
		typeof candidate.error === 'function' &&
		typeof candidate.debug === 'function' &&
		typeof candidate.child === 'function'
	);
}
