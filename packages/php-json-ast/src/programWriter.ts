import { createHash } from 'node:crypto';
import { createHelper } from '@wpkernel/core/pipeline';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import type {
	BuilderHelper,
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from './programBuilder';
import { getPhpBuilderChannel } from './builderChannel';
import type { PhpProgramAction } from './builderChannel';
import type {
	PhpProgramCodemodResult,
	PhpProgramCodemodVisitorSummary,
} from './codemods/types';
import type { PhpProgram } from './nodes';

export interface PhpDriverConfigurationOptions {
	readonly binary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
}

export interface CreatePhpProgramWriterHelperOptions {
	readonly driver?: PhpDriverConfigurationOptions;
	readonly key?: string;
}

type BuilderApplyOptions<
	TContext extends PipelineContext,
	TInput extends BuilderInput,
	TOutput extends BuilderOutput,
> = Parameters<BuilderHelper<TContext, TInput, TOutput>['apply']>[0];
type BuilderNext = Parameters<BuilderHelper['apply']>[1];

export function createPhpProgramWriterHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper<TContext, TInput, TOutput> {
	return createHelper<
		TContext,
		TInput,
		TOutput,
		PipelineContext['reporter'],
		'builder'
	>({
		key: options.key ?? 'builder.generate.php.writer',
		kind: 'builder',
		async apply(
			helperOptions: BuilderApplyOptions<TContext, TInput, TOutput>,
			next?: BuilderNext
		) {
			const { context, reporter, output } = helperOptions;
			const channel = getPhpBuilderChannel(context);
			const pending = channel.drain();

			if (pending.length === 0) {
				reporter.debug(
					'createPhpProgramWriterHelper: no programs queued.'
				);
				await next?.();
				return;
			}

			const prettyPrinterOptions: Parameters<
				typeof buildPhpPrettyPrinter
			>[0] = {
				workspace: context.workspace,
				phpBinary: options.driver?.binary,
				scriptPath: options.driver?.scriptPath,
			};

			if (options.driver?.importMetaUrl) {
				(
					prettyPrinterOptions as { importMetaUrl?: string }
				).importMetaUrl = options.driver.importMetaUrl;
			}

			const prettyPrinter = buildPhpPrettyPrinter(prettyPrinterOptions);

			await processPendingPrograms(
				context,
				output,
				reporter,
				pending,
				prettyPrinter
			);

			await next?.();
		},
	});
}

function serialiseAst(ast: unknown): string {
	return `${JSON.stringify(ast, null, 2)}\n`;
}

async function persistProgramArtifacts(
	context: PipelineContext,
	output: BuilderOutput,
	filePath: string,
	code: string,
	ast: PhpProgram
): Promise<void> {
	const astPath = `${filePath}.ast.json`;
	const serialisedAst = serialiseAst(ast);

	await context.workspace.write(filePath, code, {
		ensureDir: true,
	});

	await context.workspace.write(astPath, serialisedAst, {
		ensureDir: true,
	});

	output.queueWrite({
		file: filePath,
		contents: code,
	});

	output.queueWrite({
		file: astPath,
		contents: serialisedAst,
	});
}

async function persistCodemodDiagnostics(
	context: PipelineContext,
	output: BuilderOutput,
	filePath: string,
	codemod: PhpProgramCodemodResult
): Promise<void> {
	const basePath = `${filePath}.codemod`;
	const beforePath = `${basePath}.before.ast.json`;
	const afterPath = `${basePath}.after.ast.json`;
	const summaryPath = `${basePath}.summary.txt`;

	const beforeContents = serialiseAst(codemod.before);
	const afterContents = serialiseAst(codemod.after);
	const summaryContents = formatCodemodSummary(codemod);

	await context.workspace.write(beforePath, beforeContents, {
		ensureDir: true,
	});
	await context.workspace.write(afterPath, afterContents, {
		ensureDir: true,
	});
	await context.workspace.write(summaryPath, summaryContents, {
		ensureDir: true,
	});

	output.queueWrite({
		file: beforePath,
		contents: beforeContents,
	});
	output.queueWrite({
		file: afterPath,
		contents: afterContents,
	});
	output.queueWrite({
		file: summaryPath,
		contents: summaryContents,
	});
}

async function processPendingPrograms(
	context: PipelineContext,
	output: BuilderOutput,
	reporter: PipelineContext['reporter'],
	pending: readonly PhpProgramAction[],
	prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>
): Promise<void> {
	for (const action of pending) {
		const { code, ast } = await prettyPrinter.prettyPrint({
			filePath: action.file,
			program: action.program,
		});

		const finalAst = (ast ?? action.program) as PhpProgram;

		await persistProgramArtifacts(
			context,
			output,
			action.file,
			code,
			finalAst
		);

		if (action.codemod) {
			await persistCodemodDiagnostics(
				context,
				output,
				action.file,
				action.codemod
			);
		}

		reporter.debug('createPhpProgramWriterHelper: emitted PHP artifact.', {
			file: action.file,
		});
	}
}

function formatCodemodSummary(codemod: PhpProgramCodemodResult): string {
	const beforeHash = hashAst(codemod.before);
	const afterHash = hashAst(codemod.after);
	const differences = collectCodemodDifferences(
		codemod.before,
		codemod.after
	);

	const visitorLines = codemod.visitors.map(formatCodemodVisitorSummary);

	const lines = [
		'Codemod visitors:',
		...(visitorLines.length > 0
			? visitorLines.map((line) => `- ${line}`)
			: ['- <none declared>']),
		'',
		`Before hash: ${beforeHash}`,
		`After hash: ${afterHash}`,
		`Change detected: ${beforeHash === afterHash ? 'no' : 'yes'}`,
		'',
		'Differences:',
		...(differences.length > 0
			? differences.map((diff) => `- ${diff}`)
			: ['- No structural differences detected.']),
		'',
	];

	return `${lines.join('\n')}\n`;
}

function formatCodemodVisitorSummary(
	visitor: PhpProgramCodemodVisitorSummary
): string {
	const stackIdentifier = `${visitor.stackKey}#${visitor.stackIndex}`;
	return `${visitor.key} (stack ${stackIdentifier}, visitor ${visitor.visitorIndex}) -> ${visitor.class}`;
}

function collectCodemodDifferences(
	before: PhpProgram,
	after: PhpProgram,
	limit = 20
): string[] {
	const differences: string[] = [];
	compareValues(before, after, '$', differences, limit);
	return differences;
}

function compareValues(
	before: unknown,
	after: unknown,
	path: string,
	differences: string[],
	limit: number
): void {
	if (
		hasReachedDifferenceLimit(differences, limit) ||
		Object.is(before, after)
	) {
		return;
	}

	const beforeType = describeType(before);
	const afterType = describeType(after);

	if (beforeType !== afterType) {
		differences.push(
			`${path}: type changed from ${beforeType} to ${afterType}`
		);
		return;
	}

	if (Array.isArray(before) && Array.isArray(after)) {
		compareArrays(before, after, path, differences, limit);
		return;
	}

	if (isPlainObject(before) && isPlainObject(after)) {
		compareObjects(before, after, path, differences, limit);
		return;
	}

	differences.push(
		`${path}: ${describeValue(before)} -> ${describeValue(after)}`
	);
}

function compareArrays(
	before: readonly unknown[],
	after: readonly unknown[],
	path: string,
	differences: string[],
	limit: number
): void {
	const length = Math.min(before.length, after.length);

	for (let index = 0; index < length; index += 1) {
		compareValues(
			before[index],
			after[index],
			`${path}[${index}]`,
			differences,
			limit
		);

		if (hasReachedDifferenceLimit(differences, limit)) {
			return;
		}
	}

	if (
		before.length !== after.length &&
		!hasReachedDifferenceLimit(differences, limit)
	) {
		differences.push(
			`${path}: length changed from ${before.length} to ${after.length}`
		);
	}
}

function compareObjects(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	path: string,
	differences: string[],
	limit: number
): void {
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	const sortedKeys = Array.from(keys).sort();

	for (const key of sortedKeys) {
		if (hasReachedDifferenceLimit(differences, limit)) {
			return;
		}

		const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
		const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
		const nextPath = path === '$' ? `$.${key}` : `${path}.${key}`;

		if (!hasBefore) {
			differences.push(`${nextPath}: added ${describeValue(after[key])}`);
			continue;
		}

		if (!hasAfter) {
			differences.push(
				`${nextPath}: removed ${describeValue(before[key])}`
			);
			continue;
		}

		compareValues(before[key], after[key], nextPath, differences, limit);
	}
}

function hasReachedDifferenceLimit(
	differences: readonly unknown[],
	limit: number
): boolean {
	return differences.length >= limit;
}

function describeType(value: unknown): string {
	if (Array.isArray(value)) {
		return 'array';
	}

	if (value === null) {
		return 'null';
	}

	return typeof value;
}

function describeValue(value: unknown): string {
	if (typeof value === 'string') {
		const truncated = value.length > 57 ? `${value.slice(0, 57)}…` : value;
		return JSON.stringify(truncated);
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (value === null) {
		return 'null';
	}

	if (Array.isArray(value)) {
		return `Array(${value.length})`;
	}

	if (isPlainObject(value)) {
		const nodeType =
			typeof (value as { nodeType?: unknown }).nodeType === 'string'
				? ` ${(value as { nodeType: string }).nodeType}`
				: '';
		return `Object${nodeType}`.trim();
	}

	return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hashAst(ast: PhpProgram): string {
	const payload = JSON.stringify(ast);
	return createHash('sha256').update(payload).digest('hex');
}
