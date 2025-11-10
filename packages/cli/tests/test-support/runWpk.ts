import path from 'node:path';
import packageJson from '../../package.json' assert { type: 'json' };
import {
	buildCliIntegrationEnv,
	runNodeProcess,
	type RunProcessResult,
} from '@wpkernel/test-utils/integration';

type RunOptions = {
	env?: NodeJS.ProcessEnv;
};

type PackageJson = {
	bin?: Record<string, string> | undefined;
};

function resolveCliBinPath(): string {
	const { bin } = packageJson as PackageJson;
	if (bin) {
		const explicit = bin.wpk;
		if (typeof explicit === 'string' && explicit.length > 0) {
			return explicit;
		}

		for (const candidate of Object.values(bin)) {
			if (typeof candidate === 'string' && candidate.length > 0) {
				return candidate;
			}
		}
	}

	throw new Error('Unable to resolve CLI bin entry from package.json');
}

const CLI_BIN = path.resolve(__dirname, '..', '..', resolveCliBinPath());
const CLI_LOADER = path.resolve(__dirname, 'wpk-cli-loader.mjs');

export function runWpk(
	workspace: string,
	args: string[],
	options: RunOptions = {}
): Promise<RunProcessResult> {
	const env = buildCliIntegrationEnv(process.env, options.env);
	return runNodeProcess(CLI_BIN, args, {
		cwd: workspace,
		env,
		loader: CLI_LOADER,
		noWarnings: true,
	});
}
