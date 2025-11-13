import { performance } from 'node:perf_hooks';
import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type { InitWorkflowEnv, StageMeasurement } from './types';

export interface MeasureStageOptions {
	readonly stage: string;
	readonly label: string;
	readonly budgetMs: number;
	readonly reporter?: Reporter;
	readonly run: () => Promise<void>;
	readonly logCompletion?: boolean;
}

export interface InstallBudgets {
	readonly npm: number;
	readonly composer: number;
}

export const DEFAULT_NODE_INSTALL_BUDGET_MS = 180_000;
export const DEFAULT_COMPOSER_INSTALL_BUDGET_MS = 120_000;

export async function measureStage({
	stage,
	label,
	budgetMs,
	reporter,
	run,
	logCompletion = true,
}: MeasureStageOptions): Promise<StageMeasurement> {
	const start = performance.now();

	await run();

	const durationMs = Math.round(performance.now() - start);

	if (logCompletion && reporter) {
		reporter.info(
			`${label} completed in ${durationMs}ms (budget ${budgetMs}ms)`
		);
	}

	if (budgetMs > 0 && durationMs > budgetMs) {
		throw new WPKernelError('EnvironmentalError', {
			message: `${label} exceeded ${budgetMs}ms budget (took ${durationMs}ms)`,
			data: {
				reason: 'budget.exceeded',
				stage,
				durationMs,
				budgetMs,
			},
		});
	}

	return { durationMs, budgetMs };
}

export function resolveInstallBudgets(env?: InitWorkflowEnv): InstallBudgets {
	return {
		npm: parseBudget(
			env?.WPK_INIT_INSTALL_NODE_MAX_MS,
			DEFAULT_NODE_INSTALL_BUDGET_MS
		),
		composer: parseBudget(
			env?.WPK_INIT_INSTALL_COMPOSER_MAX_MS,
			DEFAULT_COMPOSER_INSTALL_BUDGET_MS
		),
	} satisfies InstallBudgets;
}

function parseBudget(value: string | undefined, fallback: number): number {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return parsed;
}
