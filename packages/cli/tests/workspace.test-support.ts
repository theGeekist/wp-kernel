import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface WorkspaceOptions {
	prefix?: string;
	chdir?: boolean;
	files?: Record<string, string | Buffer>;
	setup?: (workspace: string) => Promise<void> | void;
	teardown?: (workspace: string) => Promise<void> | void;
}

export async function withWorkspace(
	run: (workspace: string) => Promise<void>,
	options: WorkspaceOptions = {}
): Promise<void> {
	const {
		prefix = path.join(os.tmpdir(), 'wpk-cli-workspace-'),
		chdir = true,
		files,
		setup,
		teardown,
	} = options;

	const workspace = await fs.mkdtemp(prefix);
	const previousCwd = process.cwd();

	try {
		if (files) {
			await Promise.all(
				Object.entries(files).map(async ([relativePath, contents]) => {
					const absolutePath = path.join(workspace, relativePath);
					await fs.mkdir(path.dirname(absolutePath), {
						recursive: true,
					});
					await fs.writeFile(absolutePath, contents);
				})
			);
		}

		if (setup) {
			await setup(workspace);
		}

		if (chdir) {
			process.chdir(workspace);
		}

		try {
			await run(workspace);
		} finally {
			if (chdir) {
				process.chdir(previousCwd);
			}

			if (teardown) {
				await teardown(workspace);
			}
		}
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
}
