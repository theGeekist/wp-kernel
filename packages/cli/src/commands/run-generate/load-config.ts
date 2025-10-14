import { createReporter } from '@wpkernel/core/reporter';
import { WPK_NAMESPACE } from '@wpkernel/core/namespace/constants';
import type { Reporter } from '@wpkernel/core/reporter';
import { loadKernelConfig } from '../../config';
import { buildIr } from '../../ir';
import type { IRv1 } from '../../ir';
import { handleFailure } from './errors';
import type { ExitCode } from './types';

export interface LoadedConfig {
	loadedConfig: Awaited<ReturnType<typeof loadKernelConfig>>;
	ir: IRv1;
}

export type LoadConfigResult =
	| LoadedConfig
	| { exitCode: ExitCode; error: unknown };

export async function loadConfigAndIr(
	reporter: Reporter
): Promise<LoadConfigResult> {
	try {
		const loadedConfig = await loadKernelConfig();
		const ir = await buildIr({
			config: loadedConfig.config,
			sourcePath: loadedConfig.sourcePath,
			origin: loadedConfig.configOrigin,
			namespace: loadedConfig.namespace,
		});

		return { loadedConfig, ir };
	} catch (error) {
		const exitCode = handleFailure(error, reporter, 1);
		return { exitCode, error };
	}
}

export function createDefaultReporter(verbose: boolean): Reporter {
	return createReporter({
		namespace: `${WPK_NAMESPACE}.cli.generate`,
		level: verbose ? 'debug' : 'info',
		enabled: process.env.NODE_ENV !== 'test',
	});
}
