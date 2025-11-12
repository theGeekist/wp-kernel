import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EnvironmentalError } from '@wpkernel/core/error';
import { createComposerReadinessHelper } from '../composer';
import {
	createReadinessTestContext,
	createWorkspaceDouble,
} from '../../test/test-support';

function createHelper(
	overrides: Parameters<typeof createComposerReadinessHelper>[0] = {},
	options: { stubCli?: boolean } = {}
) {
	const { stubCli = true } = options;

	const resolveCliComposerRoot = stubCli
		? jest.fn<() => string | null>().mockReturnValue(null)
		: undefined;
	const pathExists = stubCli
		? jest.fn<() => Promise<boolean>>().mockResolvedValue(false)
		: undefined;

	const helper = createComposerReadinessHelper({
		...(resolveCliComposerRoot ? { resolveCliComposerRoot } : {}),
		...(pathExists ? { pathExists } : {}),
		...overrides,
	});

	return {
		helper,
		resolveCliComposerRoot,
		pathExists,
	};
}

describe('createComposerReadinessHelper', () => {
	it('blocks detection when workspace is unavailable', async () => {
		const { helper } = createHelper({ install: jest.fn() });
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('blocked');
	});

	it('installs composer dependencies when autoload is missing', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const removeVendor = jest.fn();
		const workspace = createWorkspaceDouble({ exists, rm: removeVendor });
		const install = jest.fn().mockResolvedValue(undefined);
		const showPhpParserMetadata = jest.fn();
		const { helper } = createHelper({
			install,
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(showPhpParserMetadata).not.toHaveBeenCalled();

		await helper.execute?.(context, detection.state);
		expect(install).toHaveBeenCalledWith('/tmp/project');

		// simulate composer autoload after install
		exists.mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(removeVendor).not.toHaveBeenCalled();
	});

	it('removes vendor directory on cleanup when install introduced it', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const removeVendor = jest.fn().mockResolvedValue(undefined);
		const workspace = createWorkspaceDouble({ exists, rm: removeVendor });
		const install = jest.fn().mockResolvedValue(undefined);
		const showPhpParserMetadata = jest.fn();
		const { helper } = createHelper({
			install,
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		const result = await helper.execute?.(context, detection.state);
		await result?.cleanup?.();

		expect(removeVendor).toHaveBeenCalledWith('vendor', {
			recursive: true,
		});
	});

	it('does not expose execute when installOnPending is false', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });

		const showPhpParserMetadata = jest.fn();
		const { helper } = createHelper({
			install: jest.fn(),
			installOnPending: false,
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(showPhpParserMetadata).not.toHaveBeenCalled();
		expect(helper.execute).toBeUndefined();

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
	});

	it('returns ready when composer metadata is present', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({
				name: 'nikic/php-parser',
				autoload: { files: ['lib/PhpParser/bootstrap.php'] },
			}),
			stderr: '',
		});
		const { helper } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(showPhpParserMetadata).toHaveBeenCalledWith('/tmp/project');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('throws EnvironmentalError when composer metadata is unavailable', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({ name: 'nikic/php-parser' }),
			stderr: '',
		});
		const { helper } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});

	it('surfaces EnvironmentalError when composer show fails', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockRejectedValue(
			Object.assign(new Error('composer failure'), {
				stdout: '',
				stderr: 'Package "nikic/php-parser" is not installed',
			})
		);
		const { helper } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});

	it('uses CLI autoload when workspace vendor is missing', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({
				name: 'nikic/php-parser',
				autoload: { files: ['lib/PhpParser/bootstrap.php'] },
			}),
			stderr: '',
		});
		const { helper, resolveCliComposerRoot, pathExists } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		resolveCliComposerRoot.mockReturnValue('/opt/cli');
		pathExists.mockImplementation((candidate: string) => {
			if (candidate === '/opt/cli/vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(showPhpParserMetadata).toHaveBeenCalledWith('/opt/cli');
		expect(detection.message).toBe('CLI composer autoload detected.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe('CLI composer autoload ready.');
	});

	it('reports missing CLI autoload during confirm when fallback disappears', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({
				name: 'nikic/php-parser',
				autoload: { files: ['lib/PhpParser/bootstrap.php'] },
			}),
			stderr: '',
		});
		const { helper, resolveCliComposerRoot, pathExists } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		resolveCliComposerRoot.mockReturnValue('/opt/cli');
		pathExists.mockResolvedValueOnce(true).mockResolvedValue(false);

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe('CLI composer autoload missing.');
	});

	it('throws EnvironmentalError when CLI autoload metadata is invalid', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({ name: 'nikic/php-parser' }),
			stderr: '',
		});
		const { helper, resolveCliComposerRoot, pathExists } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		resolveCliComposerRoot.mockReturnValue('/opt/cli');
		pathExists.mockResolvedValue(true);

		const context = createReadinessTestContext({ workspace });

		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});

	it('accepts CLI autoload when composer manifest is missing', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(false);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({
				name: 'nikic/php-parser',
				autoload: { files: ['lib/PhpParser/bootstrap.php'] },
			}),
			stderr: '',
		});
		const { helper, resolveCliComposerRoot, pathExists } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		resolveCliComposerRoot.mockReturnValue('/opt/cli');
		pathExists.mockResolvedValue(true);

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('CLI composer autoload detected.');
	});

	it('detects CLI autoload via default dependencies', async () => {
		const cliRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
		const vendorDirectory = path.join(cliRoot, 'vendor');
		const autoloadPath = path.join(vendorDirectory, 'autoload.php');
		let createdVendor = false;

		await access(autoloadPath).catch(
			async (error: NodeJS.ErrnoException) => {
				if (error?.code !== 'ENOENT') {
					throw error;
				}

				await mkdir(vendorDirectory, { recursive: true });
				await writeFile(autoloadPath, '<?php\n', 'utf8');
				createdVendor = true;
			}
		);

		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn().mockResolvedValue({
			stdout: JSON.stringify({
				name: 'nikic/php-parser',
				autoload: { files: ['lib/PhpParser/bootstrap.php'] },
			}),
			stderr: '',
		});
		const { helper } = createHelper(
			{
				install: jest.fn(),
				showPhpParserMetadata,
			},
			{ stubCli: false }
		);

		try {
			const context = createReadinessTestContext({ workspace });
			const detection = await helper.detect(context);

			expect(detection.status).toBe('ready');
			expect(detection.message).toBe('CLI composer autoload detected.');
		} finally {
			if (createdVendor) {
				await rm(vendorDirectory, { recursive: true, force: true });
			}
		}
	});

	it('returns pending when default dependencies cannot locate CLI autoload', async () => {
		const fallbackRoot = await mkdtemp(
			path.join(os.tmpdir(), 'wpk-cli-vendor-')
		);
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const showPhpParserMetadata = jest.fn();
		const { helper } = createHelper(
			{
				install: jest.fn(),
				showPhpParserMetadata,
				resolveCliComposerRoot: () => fallbackRoot,
			},
			{ stubCli: false }
		);

		try {
			const context = createReadinessTestContext({ workspace });
			const detection = await helper.detect(context);

			expect(detection.status).toBe('pending');
			expect(detection.message).toBe('Install composer dependencies.');
			expect(showPhpParserMetadata).not.toHaveBeenCalled();
		} finally {
			await rm(fallbackRoot, { recursive: true, force: true });
		}
	});

	it('blocks detection when neither workspace nor CLI autoload is available', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(false);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const workspace = createWorkspaceDouble({ exists });
		const { helper, resolveCliComposerRoot, pathExists } = createHelper({
			install: jest.fn(),
			showPhpParserMetadata: jest.fn(),
		});

		resolveCliComposerRoot.mockReturnValue('/opt/cli');
		pathExists.mockResolvedValue(false);

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe(
			'composer.json missing. Run composer init or add manifest.'
		);
	});
});
