import path from 'node:path';
import { EnvironmentalError, WPKernelError } from '@wpkernel/core/error';
import { createReleasePackReadinessHelper } from '../releasePack';
import {
	createReadinessTestContext,
	makeNoEntry,
} from '../../test/test-support';

const repoRoot = '/repo';
const projectRoot = path.join(repoRoot, 'packages', 'cli');
const manifest = [
	{
		packageName: '@wpkernel/example',
		packageDir: path.join('packages', 'example'),
		expectedArtifacts: [path.join('dist', 'index.js')],
	},
];

describe('createReleasePackReadinessHelper', () => {
	it('reports ready when all artefacts exist', async () => {
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				return undefined;
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			if (target === metricsPath) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const writeFile = jest.fn().mockResolvedValue(undefined);
		const mkdir = jest.fn().mockResolvedValue(undefined);
		const nowValues = [0, 1];
		const now = jest.fn(() => nowValues.shift() ?? 1);
		const fallbackDate = '2025-01-01T00:00:10.000Z';
		const dateValues = ['2025-01-01T00:00:00.000Z', fallbackDate];
		const createDate = jest.fn(
			() => new Date(dateValues.shift() ?? fallbackDate)
		);

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				exec: jest.fn().mockResolvedValue(undefined),
				writeFile,
				mkdir,
				now,
				createDate,
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('Release pack artefacts detected.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(access).toHaveBeenCalledWith(
			path.join(repoRoot, 'pnpm-workspace.yaml')
		);
		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(writeFile).toHaveBeenCalledWith(metricsPath, expect.any(String));
		const ledger = JSON.parse(
			(writeFile.mock.calls[0]?.[1] as string).trim()
		) as {
			runs: Array<{
				builds: unknown;
				detectionMs: number;
				totalMs: number;
				recordedAt: string;
				completedAt: string;
			}>;
		};
		expect(ledger.runs).toHaveLength(1);
		const [entry] = ledger.runs;
		expect(entry.recordedAt).toBe('2025-01-01T00:00:00.000Z');
		expect(entry.completedAt).toBe('2025-01-01T00:00:10.000Z');
		expect(entry.detectionMs).toBe(1);
		expect(entry.totalMs).toBe(1);
		expect(entry.builds).toEqual([
			{
				packageName: '@wpkernel/example',
				built: false,
				durationMs: 0,
			},
		]);
	});

	it('builds missing artefacts and confirms readiness', async () => {
		let built = false;
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				if (built) {
					return undefined;
				}

				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			if (target === metricsPath) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const exec = jest.fn(async () => {
			built = true;
		});

		const writeFile = jest.fn().mockResolvedValue(undefined);
		const mkdir = jest.fn().mockResolvedValue(undefined);
		const nowValues = [0, 2, 2, 7];
		const now = jest.fn(() => nowValues.shift() ?? 7);
		const fallbackDate = '2025-01-02T00:00:10.000Z';
		const dateValues = ['2025-01-02T00:00:00.000Z', fallbackDate];
		const createDate = jest.fn(
			() => new Date(dateValues.shift() ?? fallbackDate)
		);

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				exec,
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile,
				mkdir,
				now,
				createDate,
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toContain('Missing build artefact');

		const execution = await helper.execute?.(context, detection.state);
		const nextState = execution?.state ?? detection.state;
		expect(exec).toHaveBeenCalledWith(
			'pnpm',
			['--filter', '@wpkernel/example', 'build'],
			{
				cwd: repoRoot,
			}
		);

		const confirmation = await helper.confirm(context, nextState);
		expect(confirmation.status).toBe('ready');
		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(writeFile).toHaveBeenCalledWith(metricsPath, expect.any(String));
		const ledger = JSON.parse(
			(writeFile.mock.calls[0]?.[1] as string).trim()
		) as {
			runs: Array<{
				builds: Array<{
					packageName: string;
					built: boolean;
					durationMs: number;
				}>;
				detectionMs: number;
				totalMs: number;
			}>;
		};
		expect(ledger.runs).toHaveLength(1);
		const [entry] = ledger.runs;
		expect(entry.detectionMs).toBe(2);
		expect(entry.totalMs).toBe(7);
		expect(entry.builds).toEqual([
			{
				packageName: '@wpkernel/example',
				built: true,
				durationMs: 5,
			},
		]);
	});

	it('surfaces missing artefacts when build does not produce outputs', async () => {
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			if (target === metricsPath) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				exec: jest.fn().mockResolvedValue(undefined),
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile: jest.fn(),
				mkdir: jest.fn(),
				now: jest.fn(() => 0),
				createDate: jest.fn(() => new Date('2025-01-03T00:00:00.000Z')),
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		const run = helper.execute?.(context, detection.state);
		expect(run).toBeDefined();
		await expect(run as Promise<unknown>).rejects.toBeInstanceOf(
			EnvironmentalError
		);
		await expect(run as Promise<unknown>).rejects.toMatchObject({
			reason: 'build.missingArtifact',
		});
	});

	it('skips rebuilding when artefacts already exist', async () => {
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				return undefined;
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			if (target === metricsPath) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const exec = jest.fn();

		const writeFile = jest.fn().mockResolvedValue(undefined);
		const mkdir = jest.fn().mockResolvedValue(undefined);
		const nowValues = [0, 1];
		const now = jest.fn(() => nowValues.shift() ?? 1);
		const fallbackDate = '2025-01-04T00:00:05.000Z';
		const dateValues = ['2025-01-04T00:00:00.000Z', fallbackDate];
		const createDate = jest.fn(
			() => new Date(dateValues.shift() ?? fallbackDate)
		);

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				exec,
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile,
				mkdir,
				now,
				createDate,
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');

		const execution = await helper.execute?.(context, detection.state);
		const nextState = execution?.state ?? detection.state;
		expect(exec).not.toHaveBeenCalled();

		const confirmation = await helper.confirm(context, nextState);
		expect(confirmation.status).toBe('ready');
		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(writeFile).toHaveBeenCalledWith(metricsPath, expect.any(String));
		const ledger = JSON.parse(
			(writeFile.mock.calls[0]?.[1] as string).trim()
		) as {
			runs: Array<{
				builds: Array<{ built: boolean }>;
				detectionMs: number;
				totalMs: number;
			}>;
		};
		expect(ledger.runs).toHaveLength(1);
		const [entry] = ledger.runs;
		expect(entry.detectionMs).toBe(1);
		expect(entry.totalMs).toBe(1);
		expect(entry.builds).toEqual([
			{
				packageName: '@wpkernel/example',
				built: false,
				durationMs: 0,
			},
		]);
	});

	it('appends metrics ledger entries when previous runs exist', async () => {
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const existingLedger = {
			runs: [
				{
					recordedAt: '2025-01-01T00:00:00.000Z',
					completedAt: '2025-01-01T00:00:05.000Z',
					detectionMs: 5,
					totalMs: 5,
					builds: [
						{
							packageName: '@wpkernel/example',
							built: false,
							durationMs: 0,
						},
					],
				},
			],
		};

		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				return undefined;
			}

			if (target === metricsPath) {
				return undefined;
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			throw makeNoEntry(target);
		});

		const writeFile = jest.fn().mockResolvedValue(undefined);
		const mkdir = jest.fn().mockResolvedValue(undefined);
		const nowValues = [0, 3];
		const now = jest.fn(() => nowValues.shift() ?? 3);
		const fallbackDate = '2025-01-05T00:00:10.000Z';
		const dateValues = ['2025-01-05T00:00:00.000Z', fallbackDate];
		const createDate = jest.fn(
			() => new Date(dateValues.shift() ?? fallbackDate)
		);

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				exec: jest.fn(),
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					if (target === metricsPath) {
						return `${JSON.stringify(existingLedger)}\n`;
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile,
				mkdir,
				now,
				createDate,
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');

		expect(writeFile).toHaveBeenCalledTimes(1);
		const persisted = JSON.parse(
			(writeFile.mock.calls[0]?.[1] as string).trim()
		) as { runs: unknown[] };
		expect(persisted.runs).toHaveLength(2);
		expect(persisted.runs[0]).toEqual(existingLedger.runs[0]);
	});

	it('surfaces build failures when the package build command rejects', async () => {
		const metricsPath = path.join(repoRoot, 'metrics.json');
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(
					repoRoot,
					'packages',
					'cli',
					'dist',
					'packages',
					'php-driver',
					'dist',
					'index.js'
				)
			) {
				return undefined;
			}

			if (target === metricsPath) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			metricsPath: 'metrics.json',
			dependencies: {
				access,
				exec: jest.fn(async () => {
					throw new Error('build failed');
				}),
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						return JSON.stringify({
							exports: {
								'.': {
									import: './dist/index.js',
									default: './dist/index.js',
								},
							},
						});
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile: jest.fn(),
				mkdir: jest.fn(),
				now: jest.fn(() => 0),
				createDate: jest.fn(() => new Date('2025-01-06T00:00:00.000Z')),
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await expect(
			helper.execute?.(context, detection.state)
		).rejects.toMatchObject({ reason: 'build.failed' });
	});

	it('propagates repository resolution failures', async () => {
		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: {
				access: jest.fn(async () => {
					throw makeNoEntry('pnpm-workspace.yaml');
				}),
				exec: jest.fn(),
				readFile: jest.fn(),
				writeFile: jest.fn(),
				mkdir: jest.fn(),
				now: jest.fn(() => 0),
				createDate: jest.fn(() => new Date('2025-01-07T00:00:00.000Z')),
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		await expect(helper.detect(context)).rejects.toBeInstanceOf(
			WPKernelError
		);
		await expect(helper.detect(context)).rejects.toMatchObject({
			message:
				'Unable to resolve repository root for release-pack helper.',
		});
	});

	it('throws a developer error when the php-driver manifest cannot be read', async () => {
		const cliManifest = [
			{
				packageName: '@wpkernel/cli',
				packageDir: path.join('packages', 'cli'),
				expectedArtifacts: [
					path.join('dist', 'index.js'),
					path.join('dist', 'index.d.ts'),
				],
			},
		];

		const helper = createReleasePackReadinessHelper({
			manifest: cliManifest,
			dependencies: {
				access: jest.fn(async (target: string) => {
					if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
						return undefined;
					}

					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'cli',
							'dist',
							'index.js'
						)
					) {
						return undefined;
					}

					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'cli',
							'dist',
							'index.d.ts'
						)
					) {
						return undefined;
					}

					throw makeNoEntry(target);
				}),
				exec: jest.fn(),
				readFile: jest.fn(async (target: string) => {
					if (
						target ===
						path.join(
							repoRoot,
							'packages',
							'php-driver',
							'package.json'
						)
					) {
						throw new Error('boom');
					}

					throw new Error(`Unexpected read: ${target}`);
				}),
				writeFile: jest.fn(),
				mkdir: jest.fn(),
				now: jest.fn(() => 0),
				createDate: jest.fn(() => new Date('2025-01-08T00:00:00.000Z')),
			},
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		await expect(helper.detect(context)).rejects.toBeInstanceOf(
			WPKernelError
		);
		await expect(helper.detect(context)).rejects.toMatchObject({
			message:
				'Unable to load php-driver package definition for release-pack readiness.',
		});
	});
});
