import path from 'node:path';
import type { BuilderApplyOptions } from '../runtime/types';
import type { PlanInstruction } from './types';
import { resolvePlanPaths } from './plan.paths';
import { queueWorkspaceFile } from './patcher';

async function buildWriteInstruction(options: {
	readonly file: string;
	readonly base: string;
	readonly incoming: string;
	readonly options: BuilderApplyOptions;
	readonly description: string;
}): Promise<PlanInstruction | null> {
	const {
		file,
		base,
		incoming,
		options: builderOptions,
		description,
	} = options;
	const contents = await builderOptions.context.workspace.readText(file);
	if (!contents) {
		return null;
	}

	await builderOptions.context.workspace.write(incoming, contents, {
		ensureDir: true,
	});
	builderOptions.output.queueWrite({ file: incoming, contents });

	const baseContents =
		(await builderOptions.context.workspace.readText(base)) ?? contents;
	await builderOptions.context.workspace.write(base, baseContents, {
		ensureDir: true,
	});
	builderOptions.output.queueWrite({ file: base, contents: baseContents });

	return {
		action: 'write',
		file,
		base,
		incoming,
		description,
	};
}

export async function addBundlerInstructions({
	options,
	instructions,
}: {
	readonly options: BuilderApplyOptions;
	readonly instructions: PlanInstruction[];
}): Promise<void> {
	const paths = resolvePlanPaths(options);

	const candidates: Array<{
		file: string;
		description: string;
	}> = [
		{
			file: paths.bundlerConfig,
			description: 'Update bundler config',
		},
		{
			file: paths.viteConfig,
			description: 'Update Vite config',
		},
	];

	for (const candidate of candidates) {
		const incoming = path.posix.join(paths.planIncoming, candidate.file);
		const base = path.posix.join(paths.planBase, candidate.file);

		const instruction = await buildWriteInstruction({
			file: candidate.file,
			base,
			incoming,
			options,
			description: candidate.description,
		});

		if (instruction) {
			instructions.push(instruction);
		}
	}

	// Keep generated bundler config available to patcher merges.
	await queueWorkspaceFile(
		options.context.workspace,
		options.output,
		paths.bundlerConfig
	);
}
