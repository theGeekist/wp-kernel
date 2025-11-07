import type {
	BuilderApplyOptions,
	BuilderOutput,
} from '../../../runtime/types';
import type { Workspace } from '../../../workspace/types';
import type { BlockRenderStub } from '@wpkernel/wp-json-ast';

/**
 * Transaction label for block render callback generation phase.
 *
 * @category AST Builders
 */
export const RENDER_TRANSACTION_LABEL = 'builder.generate.php.blocks.render';

/**
 * Options for staging block render callback stubs to workspace.
 *
 * @category AST Builders
 */
export interface StageRenderStubsOptions {
	readonly stubs: readonly BlockRenderStub[];
	readonly workspace: Workspace;
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}

/**
 * Writes block render callback PHP files to workspace.
 *
 * Stages PHP render callback stubs for blocks that require server-side rendering.
 * Wraps writes in a transaction for atomic rollback on failure.
 *
 * @param    options           - Stubs, workspace, output, and reporter
 * @param    options.stubs     - Array of block render callback stubs to write
 * @param    options.workspace - Workspace manager for file operations
 * @param    options.output    - Builder output context
 * @param    options.reporter  - Reporter for progress and errors
 * @category AST Builders
 */
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
			await workspace.write(stub.relativePath, stub.contents, {
				ensureDir: true,
			});
		}
		const manifest = await workspace.commit(RENDER_TRANSACTION_LABEL);
		await queueWorkspaceFiles(workspace, output, manifest.writes);
		reporter.debug(
			'createPhpBlocksHelper: staged SSR block render stubs.',
			{
				files: manifest.writes,
			}
		);
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
