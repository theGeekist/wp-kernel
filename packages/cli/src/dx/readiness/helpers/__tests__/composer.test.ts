import { EnvironmentalError } from '@wpkernel/core/error';
import { createComposerReadinessHelper } from '../composer';
import {
	createReadinessTestContext,
	createWorkspaceDouble,
} from '../../test/test-support';

describe('createComposerReadinessHelper', () => {
	it('blocks detection when workspace is unavailable', async () => {
		const helper = createComposerReadinessHelper({ install: jest.fn() });
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
		const rm = jest.fn();
		const workspace = createWorkspaceDouble({ exists, rm });
		const install = jest.fn().mockResolvedValue(undefined);
		const showPhpParserMetadata = jest.fn();
		const helper = createComposerReadinessHelper({
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
		expect(rm).not.toHaveBeenCalled();
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
		const rm = jest.fn().mockResolvedValue(undefined);
		const workspace = createWorkspaceDouble({ exists, rm });
		const install = jest.fn().mockResolvedValue(undefined);
		const showPhpParserMetadata = jest.fn();
		const helper = createComposerReadinessHelper({
			install,
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		const result = await helper.execute?.(context, detection.state);
		await result?.cleanup?.();

		expect(rm).toHaveBeenCalledWith('vendor', { recursive: true });
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
		const helper = createComposerReadinessHelper({
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
		const helper = createComposerReadinessHelper({
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
		const helper = createComposerReadinessHelper({
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
		const helper = createComposerReadinessHelper({
			install: jest.fn(),
			showPhpParserMetadata,
		});

		const context = createReadinessTestContext({ workspace });
		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});
});
