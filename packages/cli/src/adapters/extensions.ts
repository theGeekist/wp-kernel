import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
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
	const outputRoot = await resolveOutputRoot(outputDir);

	const cleanup = async () => {
		if (disposed) {
			return;
		}

		disposed = true;
		await fs.rm(sandboxRoot, { recursive: true, force: true });
	};

	let effectiveIr = cloneIr(ir);

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
					outputRoot,
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
	return stripFunctions(ir) as IRv1;
}

interface ScheduleFileOptions {
	outputDir: string;
	sandboxDir: string;
	outputRoot: string;
	filePath: string;
	contents: string;
}

async function scheduleFile(
	options: ScheduleFileOptions
): Promise<PendingFile> {
	const { outputDir, sandboxDir, outputRoot, filePath, contents } = options;
	const targetPath = path.resolve(filePath);
	const relativeTarget = path.relative(outputDir, targetPath);

	if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
		throw new Error(
			`Adapter extensions must write inside ${outputDir}. Received: ${filePath}`
		);
	}

	await validateSandboxTarget({
		targetPath,
		relativeTarget,
		outputRoot,
		outputDir,
	});

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

async function resolveOutputRoot(outputDir: string): Promise<string> {
	try {
		return await fs.realpath(outputDir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			await fs.mkdir(outputDir, { recursive: true });
			return await fs.realpath(outputDir);
		}

		throw error;
	}
}

async function validateSandboxTarget(options: {
	targetPath: string;
	relativeTarget: string;
	outputRoot: string;
	outputDir: string;
}): Promise<void> {
	const { targetPath, relativeTarget, outputRoot, outputDir } = options;
	const segments = relativeTarget.split(path.sep).filter(Boolean);
	let current = outputDir;

	for (let index = 0; index < segments.length - 1; index += 1) {
		current = path.join(current, segments[index]!);
		const stat = await safeLstat(current);
		if (!stat) {
			break;
		}

		if (stat.isSymbolicLink()) {
			await assertWithinOutput(await fs.realpath(current), outputRoot);
		}
	}

	const existing = await safeLstat(targetPath);
	if (existing?.isSymbolicLink()) {
		await assertWithinOutput(await fs.realpath(targetPath), outputRoot);
	}
}

async function safeLstat(filePath: string): Promise<Stats | null> {
	try {
		return await fs.lstat(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

async function assertWithinOutput(
	resolvedPath: string,
	root: string
): Promise<void> {
	if (isWithinRoot(resolvedPath, root)) {
		return;
	}

	throw new Error(
		`Adapter extensions must not escape ${root}. Received: ${resolvedPath}`
	);
}

function isWithinRoot(candidate: string, root: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === '' ||
		(!relative.startsWith('..') && !path.isAbsolute(relative))
	);
}

const OMIT_FUNCTION = Symbol('omit-function');

function stripFunctions(
	value: unknown,
	seen = new WeakMap<object, unknown>()
): unknown {
	if (typeof value === 'function') {
		return OMIT_FUNCTION;
	}

	if (Array.isArray(value)) {
		return stripArray(value, seen);
	}

	if (isPlainObject(value)) {
		return stripObject(value, seen);
	}

	return value;
}

function stripArray(
	value: unknown[],
	seen: WeakMap<object, unknown>
): unknown[] {
	const existing = seen.get(value);
	if (existing) {
		return existing as unknown[];
	}

	const result: unknown[] = [];
	seen.set(value, result);

	for (const entry of value) {
		const next = stripFunctions(entry, seen);
		if (next !== OMIT_FUNCTION) {
			result.push(next);
		}
	}

	return result;
}

function stripObject(
	value: Record<string, unknown>,
	seen: WeakMap<object, unknown>
): Record<string, unknown> {
	const existing = seen.get(value);
	if (existing) {
		return existing as Record<string, unknown>;
	}

	const result: Record<string, unknown> = {};
	seen.set(value, result);

	for (const [key, entry] of Object.entries(value)) {
		const next = stripFunctions(entry, seen);
		if (next !== OMIT_FUNCTION) {
			result[key] = next;
		}
	}

	return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
