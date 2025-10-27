/**
 * Build Verification: Output Structure
 *
 * Ensures the build output has the expected structure and file organization.
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

const distPath = resolve(__dirname, '../../../dist');

const expectPathExists = (relativePath: string) => {
	const fullPath = resolve(distPath, relativePath);
	expect(existsSync(fullPath)).toBe(true);
	return fullPath;
};

const expectDirectory = (relativePath: string) => {
	const fullPath = expectPathExists(relativePath);
	expect(statSync(fullPath).isDirectory()).toBe(true);
};

describe('Build: Output structure', () => {
	it('creates the dist directory', () => {
		expectDirectory('.');
	});

	describe('Entry points', () => {
		it.each(['index.js', 'http.js', 'resource.js', 'error.js'])(
			'includes %s',
			(entryPoint) => {
				expectPathExists(entryPoint);
			}
		);
	});

	describe('Preserved module structure', () => {
		it.each(['resource', 'error', 'http'])(
			'keeps %s directory',
			(directory) => {
				expectDirectory(directory);
			}
		);

		it.each([
			'resource/define.js',
			'resource/store.js',
			'resource/cache.js',
			'error/WPKernelError.js',
			'http/fetch.js',
		])('keeps %s file', (filePath) => {
			expectPathExists(filePath);
		});
	});

	describe('Package.json compliance', () => {
		it('ships main entry points and declarations', () => {
			expectPathExists('index.js');
			expectPathExists('index.d.ts');
		});

		it.each(['http', 'resource', 'error'])(
			'exposes %s subpath export',
			(subpath) => {
				const directory = resolve(distPath, subpath);
				const file = `${subpath}.js`;
				expect(
					existsSync(directory) || existsSync(resolve(distPath, file))
				).toBe(true);
			}
		);
	});
});
