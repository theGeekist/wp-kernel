import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { KernelError } from '@geekist/wp-kernel';
import type {
	AdapterContext,
	AdapterExtension,
	AdapterExtensionContext,
} from '../config/types';
import type { IRv1 } from '../ir/types';

export interface AdapterExtensionRunResult {
	ir: IRv1;
	commit: () => Promise<void>;
	rollback: () => Promise<void>;
}

interface PendingFile {
	targetPath: string;
	sandboxPath: string;
}

interface RunAdapterExtensionsOptions {
	extensions: AdapterExtension[];
	adapterContext: AdapterContext;
	ir: IRv1;
	outputDir: string;
	configDirectory?: string;
	ensureDirectory: (directoryPath: string) => Promise<void>;
	writeFile: (filePath: string, contents: string) => Promise<void>;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
}

const SANDBOX_PREFIX = path.join(os.tmpdir(), 'wpk-adapter-ext-');

export async function runAdapterExtensions(
	options: RunAdapterExtensionsOptions
): Promise<AdapterExtensionRunResult> {
	const {
		extensions,
		adapterContext,
		ir,
		outputDir,
		configDirectory,
		ensureDirectory,
		writeFile,
		formatPhp,
		formatTs,
	} = options;

	if (extensions.length === 0) {
		return {
			ir,
			async commit() {
				// no-op
			},
			async rollback() {
				// no-op
			},
		};
	}

	const sandboxRoot = await fs.mkdtemp(SANDBOX_PREFIX);
	const pendingFiles: PendingFile[] = [];
	let disposed = false;

	const cleanup = async () => {
		if (disposed) {
			return;
		}

		disposed = true;
		await fs.rm(sandboxRoot, { recursive: true, force: true });
	};

	let effectiveIr = ir;

	for (const [index, extension] of extensions.entries()) {
		assertValidExtension(extension);
		const sandboxDir = path.join(sandboxRoot, `extension-${index}`);
		await fs.mkdir(sandboxDir, { recursive: true });

		const extensionReporter = adapterContext.reporter.child(
			`extension.${sanitizeNamespace(extension.name)}`
		);

		const clonedIr = cloneIr(effectiveIr);
		let hasUpdatedIr = false;
		let nextIr: IRv1 | undefined;

		const context: AdapterExtensionContext = {
			...adapterContext,
			reporter: extensionReporter,
			ir: clonedIr,
			outputDir,
			configDirectory,
			tempDir: sandboxDir,
			formatPhp,
			formatTs,
			async queueFile(filePath: string, contents: string) {
				const scheduled = await scheduleFile({
					outputDir,
					sandboxDir,
					filePath,
					contents,
				});
				pendingFiles.push(scheduled);
			},
			updateIr(candidate: IRv1) {
				hasUpdatedIr = true;
				nextIr = cloneIr(candidate);
			},
		};

		try {
			await extension.apply(context);
		} catch (error) {
			extensionReporter.error('Adapter extension failed.', {
				name: extension.name,
				error: serialiseError(error),
			});
			await cleanup();
			throw normaliseError(error);
		}

		effectiveIr = hasUpdatedIr && nextIr ? nextIr : clonedIr;
	}

	return {
		ir: effectiveIr,
		async commit() {
			if (disposed) {
				return;
			}

			try {
				for (const file of pendingFiles) {
					const contents = await fs.readFile(
						file.sandboxPath,
						'utf8'
					);
					await ensureDirectory(path.dirname(file.targetPath));
					await writeFile(file.targetPath, contents);
				}
			} finally {
				await cleanup();
			}
		},
		async rollback() {
			if (disposed) {
				return;
			}

			await cleanup();
		},
	};
}

function cloneIr(ir: IRv1): IRv1 {
	if (typeof globalThis.structuredClone === 'function') {
		try {
			return globalThis.structuredClone(ir) as IRv1;
		} catch (_error) {
			// When structuredClone throws (e.g. because a polyfill is
			// unavailable), fall back to the JSON-based approach below.
		}
	}

	// Fallback to JSON cloning when structuredClone is unavailable or
	// throws. Our IR graphs contain only plain objects/arrays/primitives, so
	// JSON serialisation preserves the required data while keeping the
	// fallback dependency-free. If richer types are introduced in the
	// future, this should be revisited.
	return JSON.parse(JSON.stringify(ir)) as IRv1;
}

interface ScheduleFileOptions {
	outputDir: string;
	sandboxDir: string;
	filePath: string;
	contents: string;
}

async function scheduleFile(
	options: ScheduleFileOptions
): Promise<PendingFile> {
	const { outputDir, sandboxDir, filePath, contents } = options;
	const targetPath = path.resolve(filePath);
	const relativeTarget = path.relative(outputDir, targetPath);

	if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
		throw new Error(
			`Adapter extensions must write inside ${outputDir}. Received: ${filePath}`
		);
	}

	const sandboxPath = path.join(sandboxDir, 'files', relativeTarget);
	await fs.mkdir(path.dirname(sandboxPath), { recursive: true });
	await fs.writeFile(sandboxPath, contents, 'utf8');

	return { targetPath, sandboxPath };
}

function sanitizeNamespace(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
}

function serialiseError(error: unknown): Record<string, unknown> {
	if (KernelError.isKernelError(error)) {
		return {
			code: error.code,
			message: error.message,
			context: error.context,
			data: error.data,
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
		};
	}

	return { message: String(error) };
}

function normaliseError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (KernelError.isKernelError(error)) {
		return error;
	}

	return new Error(String(error));
}

function assertValidExtension(
	extension: AdapterExtension | undefined | null
): asserts extension is AdapterExtension {
	if (!extension) {
		throw new Error('Invalid adapter extension returned from factory.');
	}

	if (typeof extension.name !== 'string' || extension.name.trim() === '') {
		throw new Error('Adapter extensions must provide a non-empty name.');
	}

	if (typeof extension.apply !== 'function') {
		throw new Error('Adapter extensions must define an apply() function.');
	}
}
