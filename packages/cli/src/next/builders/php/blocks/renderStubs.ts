import type {
	BuilderApplyOptions,
	BuilderOutput,
} from '../../../runtime/types';
import type { Workspace } from '../../../workspace/types';
import type { ProcessedBlockManifest } from '../../blocks/manifest';

export const RENDER_TRANSACTION_LABEL = 'builder.generate.php.blocks.render';

export interface StageRenderStubsOptions {
	readonly stubs: readonly NonNullable<
		ProcessedBlockManifest['renderStub']
	>[];
	readonly workspace: Workspace;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}

export async function stageRenderStubs({
	stubs,
	workspace,
	output,
	reporter,
}: StageRenderStubsOptions): Promise<void> {
	if (stubs.length === 0) {
		return;
	}

	workspace.begin(RENDER_TRANSACTION_LABEL);
	try {
		for (const stub of stubs) {
			await workspace.write(stub.path, stub.contents, {
				ensureDir: true,
			});
		}
		const manifest = await workspace.commit(RENDER_TRANSACTION_LABEL);
		await queueWorkspaceFiles(workspace, output, manifest.writes);
		reporter.debug('createPhpBlocksHelper: render stubs emitted.', {
			files: manifest.writes,
		});
	} catch (error) {
		await workspace.rollback(RENDER_TRANSACTION_LABEL);
		throw error;
	}
}

async function queueWorkspaceFiles(
	workspace: Workspace,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const data = await workspace.read(file);
		if (!data) {
			continue;
		}

		output.queueWrite({
			file,
			contents: data.toString('utf8'),
		});
	}
}
