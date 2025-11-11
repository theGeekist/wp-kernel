import path from 'node:path';
import process from 'node:process';
import {
	createReleasePackReadinessHelper,
	type ReleasePackState,
} from '../src/dx/readiness/helpers/releasePack';
import type { DxContext } from '../src/dx/context';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
	ReadinessStepResult,
} from '../src/dx/readiness/types';

interface HelperRunResult {
	readonly detection: ReadinessDetection<ReleasePackState>;
	readonly confirmation: ReadinessConfirmation<ReleasePackState>;
	readonly state: ReleasePackState;
	readonly performedWork: boolean;
}

interface Reporter {
	info: (message: string, context?: unknown) => void;
	warn: (message: string, context?: unknown) => void;
	error: (message: string, context?: unknown) => void;
	debug: (message: string, context?: unknown) => void;
	child: (namespace: string) => Reporter;
}

function createSilentReporter(): Reporter {
	return {
		info: () => undefined,
		warn: () => undefined,
		error: () => undefined,
		debug: () => undefined,
		child: () => createSilentReporter(),
	} satisfies Reporter;
}

function buildContext(): DxContext {
	const reporter = createSilentReporter();

	return {
		reporter,
		workspace: null,
		environment: {
			cwd: process.cwd(),
			projectRoot: path.resolve('packages/cli'),
			workspaceRoot: null,
			flags: { forceSource: process.env.WPK_CLI_FORCE_SOURCE === '1' },
		},
	} satisfies DxContext;
}

async function applyStep(
	helper: ReadinessHelper<ReleasePackState>,
	step: keyof Pick<ReadinessHelper<ReleasePackState>, 'prepare' | 'execute'>,
	context: DxContext,
	state: ReleasePackState
): Promise<ReadinessStepResult<ReleasePackState> | null> {
	const fn = helper[step];
	if (!fn) {
		return null;
	}

	return fn.call(helper, context, state);
}

async function runHelper(
	helper: ReadinessHelper<ReleasePackState>,
	context: DxContext
): Promise<HelperRunResult> {
	const detection = await helper.detect(context);
	if (detection.status === 'blocked') {
		throw new Error(
			'release-pack helper reported blocked status during detection.'
		);
	}

	let currentState = detection.state;
	let performed = false;

	if (detection.status === 'pending') {
		const prepareResult = await applyStep(
			helper,
			'prepare',
			context,
			currentState
		);
		if (prepareResult) {
			currentState = prepareResult.state;
			performed = true;
		}

		const executeResult = await applyStep(
			helper,
			'execute',
			context,
			currentState
		);
		if (executeResult) {
			currentState = executeResult.state;
			performed = true;
		}
	}

	const confirmation = await helper.confirm(context, currentState);
	if (confirmation.status !== 'ready') {
		throw new Error(
			`release-pack helper confirmation status ${confirmation.status} is not ready.`
		);
	}

	return {
		detection,
		confirmation,
		state: confirmation.state,
		performedWork: performed,
	} satisfies HelperRunResult;
}

function assertTimingWithinTolerance(
	baselineMs: number,
	repeatMs: number,
	toleranceRatio: number
): void {
	const delta = Math.abs(repeatMs - baselineMs);
	const tolerance = baselineMs * toleranceRatio;

	if (baselineMs === 0 && repeatMs === 0) {
		return;
	}

	if (delta > tolerance) {
		throw new Error(
			`release-pack timings drifted by ${delta.toFixed(2)}ms (baseline ${baselineMs.toFixed(
				2
			)}ms, repeat ${repeatMs.toFixed(2)}ms, tolerance ${(
				toleranceRatio * 100
			).toFixed(2)}%)`
		);
	}
}

function assertNoRebuild(metrics: ReleasePackState['metrics']): void {
	const rebuilt = metrics.builds.filter((entry) => entry.built);
	if (rebuilt.length > 0) {
		const packages = rebuilt.map((entry) => entry.packageName).join(', ');
		throw new Error(
			`release-pack helper rebuilt packages on the second run: ${packages}`
		);
	}
}

function logMetrics(label: string, metrics: ReleasePackState['metrics']): void {
	const summary = metrics.builds
		.map(
			(entry) =>
				`${entry.packageName}: built=${entry.built} duration=${entry.durationMs.toFixed(
					2
				)}ms`
		)
		.join('; ');

	console.log(
		`[release-pack-ci] ${label} detection=${metrics.detectionMs.toFixed(2)}ms total=${metrics.totalMs.toFixed(
			2
		)}ms | ${summary}`
	);
}

async function main(): Promise<void> {
	const helper = createReleasePackReadinessHelper();
	const context = buildContext();

	const first = await runHelper(helper, context);
	const second = await runHelper(helper, context);

	logMetrics('baseline', first.state.metrics);
	logMetrics('repeat', second.state.metrics);

	assertTimingWithinTolerance(
		first.state.metrics.totalMs,
		second.state.metrics.totalMs,
		0.05
	);
	assertNoRebuild(second.state.metrics);

	console.log(
		'[release-pack-ci] release-pack readiness helper passed CI checks.'
	);
}

main().catch((error) => {
	console.error('[release-pack-ci] release-pack readiness check failed.');
	console.error(
		error instanceof Error ? (error.stack ?? error.message) : error
	);
	process.exitCode = 1;
});
