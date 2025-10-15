import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { createIsolatedWorkspace } from '../integration/workspace.js';
import { createEphemeralRegistry } from '../integration/registry.js';

describe('createEphemeralRegistry', () => {
	it('serves packed workspace packages', async () => {
		const workspace = await createIsolatedWorkspace();
		const pkgDir = path.join(workspace.root, 'packages', 'sample');
		await fs.mkdir(pkgDir, { recursive: true });

		const ignoredDir = path.join(workspace.root, 'packages', 'ignored');
		await fs.mkdir(ignoredDir, { recursive: true });
		await fs.writeFile(
			path.join(ignoredDir, 'package.json'),
			JSON.stringify({ name: 'not-wpk', version: '1.0.0' }),
			'utf8'
		);

		const pkgJson = {
			name: '@wpkernel/sample',
			version: '0.1.0-test',
			main: 'index.js',
			files: ['index.js'],
		};

		await fs.writeFile(
			path.join(pkgDir, 'package.json'),
			JSON.stringify(pkgJson, null, 2),
			'utf8'
		);
		await fs.writeFile(
			path.join(pkgDir, 'index.js'),
			"module.exports = 'sample';\n",
			'utf8'
		);

		const registry = await createEphemeralRegistry({
			workspaceRoot: workspace.root,
		});

		const metadata = (await requestJson(
			`${registry.url}/@wpkernel%2Fsample`
		)) as {
			'dist-tags': { latest: string };
			versions: Record<string, { dist: { tarball: string } }>;
		};

		expect(metadata['dist-tags'].latest).toBe('0.1.0-test');
		const tarballUrl = metadata.versions['0.1.0-test'].dist.tarball;
		const tarballBuffer = await requestBuffer(tarballUrl);
		expect(tarballBuffer.length).toBeGreaterThan(0);

		const distTags = (await requestJson(
			`${registry.url}/-/package/@wpkernel%2Fsample/dist-tags`
		)) as { latest: string };
		expect(distTags.latest).toBe('0.1.0-test');

		const versions = (await requestJson(
			`${registry.url}/-/package/@wpkernel%2Fsample/versions`
		)) as { versions: string[] };
		expect(versions.versions).toContain('0.1.0-test');

		await registry.writeNpmRc(workspace.root);
		const npmrc = await fs.readFile(
			path.join(workspace.root, '.npmrc'),
			'utf8'
		);
		expect(npmrc).toContain(registry.url);

		const missing = await requestRaw(`${registry.url}/@wpkernel%2Fmissing`);
		expect(missing.statusCode).toBe(404);

		const methodNotAllowed = await requestRaw(
			`${registry.url}/@wpkernel%2Fsample`,
			{
				method: 'POST',
			}
		);
		expect(methodNotAllowed.statusCode).toBe(405);

		const missingDistTags = await requestRaw(
			`${registry.url}/-/package/@wpkernel%2Fmissing/dist-tags`
		);
		expect(missingDistTags.statusCode).toBe(404);

		const missingVersions = await requestRaw(
			`${registry.url}/-/package/@wpkernel%2Fmissing/versions`
		);
		expect(missingVersions.statusCode).toBe(404);

		const unsupportedEndpoint = await requestRaw(
			`${registry.url}/-/package/@wpkernel%2Fsample/unsupported`
		);
		expect(unsupportedEndpoint.statusCode).toBe(404);

		await fs.unlink(registry.packages[0].tarballPath);
		const missingTarball = await requestRaw(tarballUrl);
		expect(missingTarball.statusCode).toBe(500);

		const missingTarballPackage = await requestRaw(
			`${registry.url}/@wpkernel%2Fmissing/-/missing-1.0.0.tgz`
		);
		expect(missingTarballPackage.statusCode).toBe(404);

		const invalidPackageMeta = await requestRaw(
			`${registry.url}/@invalid-scope`
		);
		expect(invalidPackageMeta.statusCode).toBe(404);

		const invalidTarballStructure = await requestRaw(
			`${registry.url}/invalid/-/file.tgz`
		);
		expect(invalidTarballStructure.statusCode).toBe(404);

		await registry.dispose();
		await workspace.dispose();
	}, 30000);
});

interface RequestOptions {
	method?: string;
}

function requestBuffer(
	url: string,
	options: RequestOptions = {}
): Promise<Buffer> {
	return requestRaw(url, options).then(({ statusCode, body }) => {
		if (statusCode >= 400) {
			throw new Error(`Request failed with ${statusCode}`);
		}
		return body;
	});
}

async function requestJson(
	url: string,
	options: RequestOptions = {}
): Promise<unknown> {
	const buffer = await requestBuffer(url, options);
	return JSON.parse(buffer.toString('utf8'));
}

function requestRaw(
	url: string,
	options: RequestOptions = {}
): Promise<{ statusCode: number; body: Buffer }> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https:') ? https : http;
		const req = client.request(
			url,
			{ method: options.method ?? 'GET' },
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk) => chunks.push(chunk));
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode ?? 0,
						body: Buffer.concat(chunks),
					});
				});
			}
		);
		req.on('error', reject);
		req.end();
	});
}
