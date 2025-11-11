import path from 'node:path';
import process from 'node:process';
import { createBootstrapperResolutionReadinessHelper } from '../src/dx/readiness/helpers/bootstrapperResolution';
import type { DxContext } from '../src/dx/context';

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
		},
	} satisfies DxContext;
}

function assertReadyStatus(
	stage: 'detection' | 'confirmation' | 'rerun',
	status: 'ready' | 'pending',
	message?: string
): void {
	if (status === 'ready') {
		return;
	}

	const reason = message ?? 'No diagnostic message provided.';
	throw new Error(
		`bootstrapper-resolution helper ${stage} reported ${status} status: ${reason}`
	);
}

async function main(): Promise<void> {
	const helper = createBootstrapperResolutionReadinessHelper();
	const context = buildContext();

	const detection = await helper.detect(context);
	assertReadyStatus('detection', detection.status, detection.message);

	const confirmation = await helper.confirm(context, detection.state);
	assertReadyStatus(
		'confirmation',
		confirmation.status,
		confirmation.message
	);

	const rerun = await helper.detect(context);
	assertReadyStatus('rerun', rerun.status, rerun.message);

	const duration =
		rerun.state.lastRun?.durationMs ?? detection.state.lastRun?.durationMs;
	console.log(
		`Bootstrapper resolved bundled CLI dependencies in ${duration ?? 'unknown'}ms.`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
