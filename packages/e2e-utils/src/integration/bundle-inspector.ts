import path from 'node:path';
import { promises as fs } from 'node:fs';
import type {
	BundleEntrySummary,
	BundleInspectionRequest,
	BundleInspectionResult,
} from './types.js';

const DEFAULT_EXTERNALS = [
	'react',
	'react-dom',
	'@wordpress/data',
	'@wordpress/element',
];

export async function inspectBundle(
	request: BundleInspectionRequest
): Promise<BundleInspectionResult> {
	const externals = request.externals ?? DEFAULT_EXTERNALS;
	const entries: BundleEntrySummary[] = [];

	await walk(request.buildDir, async (filePath) => {
		if (!filePath.endsWith('.js')) {
			return;
		}

		const content = await fs.readFile(filePath, 'utf8');
		const { hasSourceMap, sourceMapPath, sourcemapViolations } =
			await evaluateSourceMap(filePath, content);
		const externalViolations = evaluateExternalCompliance(
			content,
			externals
		);

		const stat = await fs.stat(filePath);
		entries.push({
			file: path.relative(request.buildDir, filePath),
			size: stat.size,
			hasSourceMap,
			sourceMapPath,
			externalViolations,
			sourcemapViolations,
		});
	});

	return {
		entries: entries.sort((a, b) => a.file.localeCompare(b.file)),
		externalsChecked: [...externals],
		generatedAt: new Date().toISOString(),
	};
}

function evaluateExternalCompliance(
	content: string,
	externals: string[]
): string[] {
	const violations: string[] = [];

	for (const external of externals) {
		if (isReactExternal(external) && reactInlineSignatureFound(content)) {
			violations.push(external);
			continue;
		}

		if (
			isWordPressExternal(external) &&
			wordpressInlineSignatureFound(content)
		) {
			violations.push(external);
			continue;
		}
	}

	return violations;
}

function isReactExternal(external: string): boolean {
	return (
		external === 'react' ||
		external === 'react-dom' ||
		external === 'react/jsx-runtime'
	);
}

function isWordPressExternal(external: string): boolean {
	return external.startsWith('@wordpress/');
}

const REACT_SIGNATURES = [
	'__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
	'__REACT_DEVTOOLS_GLOBAL_HOOK__',
];

function reactInlineSignatureFound(content: string): boolean {
	return REACT_SIGNATURES.some((signature) => content.includes(signature));
}

const WORDPRESS_INLINE_PATTERN = /@wordpress\/[a-z-]+\/build/i;

function wordpressInlineSignatureFound(content: string): boolean {
	return WORDPRESS_INLINE_PATTERN.test(content);
}

async function evaluateSourceMap(
	filePath: string,
	content: string
): Promise<{
	hasSourceMap: boolean;
	sourceMapPath?: string;
	sourcemapViolations: string[];
}> {
	const sourceMapDirective = /\/# sourceMappingURL=(.+)$/m.exec(content);
	if (!sourceMapDirective) {
		return { hasSourceMap: false, sourcemapViolations: ['missing'] };
	}

	const relativeMapPath = sourceMapDirective[1];
	if (!relativeMapPath) {
		return { hasSourceMap: false, sourcemapViolations: ['missing'] };
	}

	const normalisedMapPath = relativeMapPath.trim();
	if (!normalisedMapPath) {
		return { hasSourceMap: false, sourcemapViolations: ['missing'] };
	}

	const mapPath = path.resolve(path.dirname(filePath), normalisedMapPath);

	try {
		const raw = await fs.readFile(mapPath, 'utf8');
		const parsed = JSON.parse(raw) as { sources?: string[] };
		const sources = parsed.sources ?? [];

		const violations = sources.some((source) => !source.includes('src/'))
			? ['sources-outside-src']
			: [];

		return {
			hasSourceMap: true,
			sourceMapPath: mapPath,
			sourcemapViolations: violations,
		};
	} catch (error) {
		return {
			hasSourceMap: false,
			sourcemapViolations: [`unreadable:${(error as Error).message}`],
		};
	}
}

async function walk(
	directory: string,
	visitor: (file: string) => Promise<void>
): Promise<void> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const filePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			await walk(filePath, visitor);
		} else {
			await visitor(filePath);
		}
	}
}
