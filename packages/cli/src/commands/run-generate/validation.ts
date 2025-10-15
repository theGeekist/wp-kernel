import path from 'node:path';
import type * as tsModule from 'typescript';
import { KernelError } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { GenerationSummary } from './types';

interface ValidateGeneratedImportsOptions {
	projectRoot: string;
	summary: GenerationSummary;
	reporter: Reporter;
}

type TypeScriptModule = typeof tsModule;

type CompilerOptions = tsModule.CompilerOptions;
type Diagnostic = tsModule.Diagnostic;

const RELEVANT_MESSAGE_PATTERNS = [
	/Cannot find module/i,
	/has no exported member/i,
	/does not contain a default export/i,
	/File '.+' is not a module/i,
	/Could not find a declaration file for module/i,
];

const SCRIPT_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
]);

export async function validateGeneratedImports({
	projectRoot,
	summary,
	reporter,
}: ValidateGeneratedImportsOptions): Promise<void> {
	if (summary.dryRun) {
		reporter.debug(
			'Skipping import validation because dry-run mode is enabled.'
		);
		return;
	}

	const scriptEntries = summary.entries.filter(
		(entry) => entry.status !== 'skipped' && isScriptFile(entry.path)
	);

	if (scriptEntries.length === 0) {
		reporter.debug('No generated script artifacts to validate.');
		return;
	}

	const ts = await loadTypeScript();
	const compilerOptions = await loadCompilerOptions(ts, projectRoot);
	compilerOptions.noEmit = true;

	const rootNames = Array.from(
		new Set(
			scriptEntries.map((entry) =>
				toAbsolutePath(projectRoot, entry.path)
			)
		)
	);
	const generatedPathSet = new Set(
		rootNames.map((filePath) => normalisePath(filePath))
	);

	const host = ts.createCompilerHost(compilerOptions, true);
	const program = ts.createProgram({
		rootNames,
		options: compilerOptions,
		host,
	});

	const diagnostics = [
		...program.getOptionsDiagnostics(),
		...program.getSyntacticDiagnostics(),
		...program.getSemanticDiagnostics(),
	];

	const relevantDiagnostics = diagnostics.filter((diagnostic) =>
		isRelevantDiagnostic(ts, diagnostic, generatedPathSet, projectRoot)
	);

	if (relevantDiagnostics.length === 0) {
		reporter.debug(
			'Module export validation passed for generated artifacts.',
			{
				checkedFiles: scriptEntries.map((entry) => entry.path),
			}
		);
		return;
	}

	const formatted = ts.formatDiagnosticsWithColorAndContext(
		relevantDiagnostics,
		{
			getCanonicalFileName: (fileName: string) =>
				normaliseRelativePath(projectRoot, fileName),
			getCurrentDirectory: () => projectRoot,
			getNewLine: () => ts.sys.newLine,
		}
	);

	throw new KernelError('ValidationError', {
		message:
			'Generated artifacts reference modules or exports that do not exist. Ensure project dependencies are installed and printers are up to date.',
		context: {
			diagnostics: relevantDiagnostics.map((diagnostic) => ({
				code: diagnostic.code,
				message: ts.flattenDiagnosticMessageText(
					diagnostic.messageText,
					'\n'
				),
				file: diagnostic.file
					? normaliseRelativePath(
							projectRoot,
							diagnostic.file.fileName
						)
					: undefined,
			})),
		},
		data: {
			formattedDiagnostics: formatted,
		},
	});
}

async function loadTypeScript(): Promise<TypeScriptModule> {
	try {
		return await import('typescript');
	} catch (error) {
		throw new KernelError('DeveloperError', {
			message:
				'TypeScript is required to validate generated imports. Install it as a development dependency.',
			data:
				error instanceof Error
					? { originalError: error }
					: { rawError: error },
		});
	}
}

async function loadCompilerOptions(
	ts: TypeScriptModule,
	projectRoot: string
): Promise<CompilerOptions> {
	const configPath = ts.findConfigFile(
		projectRoot,
		ts.sys.fileExists,
		'tsconfig.json'
	);

	if (!configPath) {
		return applyCompilerOptionDefaults(ts, projectRoot, {});
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

	if (configFile.error) {
		const formatted = ts.formatDiagnosticsWithColorAndContext(
			[configFile.error],
			{
				getCanonicalFileName: (fileName: string) =>
					normaliseRelativePath(projectRoot, fileName),
				getCurrentDirectory: () => projectRoot,
				getNewLine: () => ts.sys.newLine,
			}
		);

		throw new KernelError('DeveloperError', {
			message: 'Unable to read tsconfig.json for validation.',
			data: { diagnostics: formatted },
		});
	}

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(configPath)
	);

	if (parsed.errors.length > 0) {
		const formatted = ts.formatDiagnosticsWithColorAndContext(
			parsed.errors,
			{
				getCanonicalFileName: (fileName: string) =>
					normaliseRelativePath(projectRoot, fileName),
				getCurrentDirectory: () => projectRoot,
				getNewLine: () => ts.sys.newLine,
			}
		);

		throw new KernelError('DeveloperError', {
			message: 'tsconfig.json contains errors that block validation.',
			data: { diagnostics: formatted },
		});
	}

	return applyCompilerOptionDefaults(ts, projectRoot, parsed.options);
}

function applyCompilerOptionDefaults(
	ts: TypeScriptModule,
	projectRoot: string,
	options: CompilerOptions
): CompilerOptions {
	const resolved: CompilerOptions = { ...options };

	const defaults: Partial<CompilerOptions> = {
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		allowJs: true,
		skipLibCheck: true,
		esModuleInterop: true,
		allowSyntheticDefaultImports: true,
		resolveJsonModule: true,
	};

	for (const [key, value] of Object.entries(defaults) as Array<
		[keyof CompilerOptions, CompilerOptions[keyof CompilerOptions]]
	>) {
		if (resolved[key] === undefined) {
			resolved[key] = value;
		}
	}

	if (resolved.baseUrl === undefined) {
		resolved.baseUrl = projectRoot;
	}

	return resolved;
}

function isRelevantDiagnostic(
	ts: TypeScriptModule,
	diagnostic: Diagnostic,
	generatedPathSet: Set<string>,
	projectRoot: string
): boolean {
	if (diagnostic.category !== ts.DiagnosticCategory.Error) {
		return false;
	}

	const message = ts.flattenDiagnosticMessageText(
		diagnostic.messageText,
		'\n'
	);

	if (!RELEVANT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
		return false;
	}

	if (!diagnostic.file) {
		return true;
	}

	const specifier = extractModuleSpecifier(diagnostic);
	if (specifier && !shouldValidateModule(specifier)) {
		return false;
	}

	const absolute = normalisePath(path.resolve(diagnostic.file.fileName));

	if (generatedPathSet.has(absolute)) {
		return true;
	}

	const relative = normaliseRelativePath(
		projectRoot,
		diagnostic.file.fileName
	);
	const resolvedRelative = normalisePath(path.resolve(projectRoot, relative));
	return generatedPathSet.has(resolvedRelative);
}

function isScriptFile(filePath: string): boolean {
	const extension = path.extname(filePath).toLowerCase();
	return SCRIPT_EXTENSIONS.has(extension);
}

function toAbsolutePath(projectRoot: string, filePath: string): string {
	return path.isAbsolute(filePath)
		? filePath
		: path.resolve(projectRoot, filePath);
}

function normalisePath(filePath: string): string {
	return path.resolve(filePath).split(path.sep).join('/');
}

function normaliseRelativePath(projectRoot: string, filePath: string): string {
	const relative = path.relative(projectRoot, path.resolve(filePath));
	if (!relative || relative === '.') {
		return path.basename(filePath);
	}
	return relative.split(path.sep).join('/');
}

function extractModuleSpecifier(diagnostic: Diagnostic): string | null {
	if (
		!diagnostic.file ||
		typeof diagnostic.start !== 'number' ||
		typeof diagnostic.length !== 'number'
	) {
		return null;
	}

	const sourceText = diagnostic.file.text;
	if (!sourceText) {
		return null;
	}

	const raw = sourceText
		.slice(diagnostic.start, diagnostic.start + diagnostic.length)
		.trim();

	if (raw.length === 0) {
		return null;
	}

	return raw.replace(/^['"`]/, '').replace(/['"`]$/, '');
}

function shouldValidateModule(specifier: string): boolean {
	if (specifier.startsWith('.')) {
		return true;
	}

	if (specifier.startsWith('@/')) {
		return true;
	}

	if (/^@wpkernel(\/|$)/.test(specifier)) {
		return true;
	}

	if (specifier.startsWith('@test-utils/')) {
		return true;
	}

	return false;
}
