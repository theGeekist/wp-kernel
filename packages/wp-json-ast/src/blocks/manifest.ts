import {
	buildDeclare,
	buildDeclareItem,
	buildReturn,
	buildScalarInt,
	type PhpProgram,
} from '@wpkernel/php-json-ast';

import { buildBlockManifestDocblock } from '../common/docblock';
import { buildBlockManifestMetadata } from '../common/metadata/block';
import {
	renderPhpValue,
	type StructuredPhpValue,
} from '../resource/common/phpValue';
import { buildGuardedBlock, withGeneratedDocComment } from './utils';
import type {
	BlockManifestConfig,
	BlockManifestEntries,
	BlockManifestEntry,
	BlockManifestEntryRecord,
	BlockManifestFile,
	BlockManifestMap,
	BlockManifestMetadataResult,
} from './types';
import type { BlockManifestValidationError } from '../types';

const DEFAULT_MANIFEST_FILE = 'build/blocks-manifest.php';

type ManifestEntryTuple = readonly [string, BlockManifestEntryRecord];

type MutableManifestEntries = ManifestEntryTuple[];

type MutableManifestErrors = BlockManifestValidationError[];

interface ManifestProgramOptions {
	readonly docblock: readonly string[];
	readonly manifest: BlockManifestMap;
}

interface ManifestSanitizerOptions {
	readonly blockKey: string;
	readonly entry: BlockManifestEntry;
	readonly errors: MutableManifestErrors;
}

/**
 * @param    entries
 * @category WordPress AST
 */
export function buildManifestMetadata(
	entries: BlockManifestEntries
): BlockManifestMetadataResult {
	const errors: MutableManifestErrors = [];
	const manifestEntries: MutableManifestEntries = [];

	for (const [blockKey, entry] of Object.entries(entries)) {
		const sanitised = sanitizeEntry({ blockKey, entry, errors });
		if (!sanitised) {
			continue;
		}

		manifestEntries.push([blockKey, sanitised]);
	}

	manifestEntries.sort(([left], [right]) => left.localeCompare(right));

	return {
		manifest: Object.fromEntries(manifestEntries),
		errors,
	} satisfies BlockManifestMetadataResult;
}

/**
 * @param    origin
 * @param    config
 * @category WordPress AST
 */
export function buildBlockManifestFile(
	origin: string,
	config: BlockManifestConfig
): BlockManifestFile {
	const docblock = buildBlockManifestDocblock({ origin });
	const manifestMetadata = buildManifestMetadata(config.entries);
	const metadata = buildBlockManifestMetadata({
		validationErrors: manifestMetadata.errors,
	});
	const program = buildManifestProgram({
		docblock,
		manifest: manifestMetadata.manifest,
	});

	return {
		fileName: config.fileName ?? DEFAULT_MANIFEST_FILE,
		namespace: null,
		docblock,
		metadata,
		program,
	} satisfies BlockManifestFile;
}

function buildManifestProgram({
	docblock,
	manifest,
}: ManifestProgramOptions): PhpProgram {
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const returnStatement = withGeneratedDocComment(
		buildReturn(renderPhpValue(manifest as StructuredPhpValue)),
		docblock
	);

	return [strictTypes, ...buildGuardedBlock([returnStatement])];
}

function sanitizeEntry({
	blockKey,
	entry,
	errors,
}: ManifestSanitizerOptions): BlockManifestEntryRecord | null {
	const manifest: BlockManifestEntryRecord = {};

	const directory = normaliseString(entry.directory);
	if (!directory) {
		errors.push({
			code: 'block-manifest/missing-directory',
			block: blockKey,
			field: 'directory',
			message: `Block "${blockKey}": manifest entry is missing a directory path.`,
			value: entry.directory,
		});
		return null;
	}
	manifest.directory = directory;

	const manifestPath = normaliseString(entry.manifest);
	if (!manifestPath) {
		errors.push({
			code: 'block-manifest/missing-manifest',
			block: blockKey,
			field: 'manifest',
			message: `Block "${blockKey}": manifest entry is missing a manifest file path.`,
			value: entry.manifest,
		});
		return null;
	}
	manifest.manifest = manifestPath;

	if ('render' in entry) {
		const renderPath = normaliseOptionalString(entry.render);
		if (renderPath === null) {
			errors.push({
				code: 'block-manifest/invalid-render',
				block: blockKey,
				field: 'render',
				message: `Block "${blockKey}": render path must be a non-empty string when provided.`,
				value: entry.render,
			});
		} else if (renderPath) {
			manifest.render = renderPath;
		}
	}

	return sanitizeRecord(manifest);
}

function sanitizeRecord(
	value: BlockManifestEntryRecord
): BlockManifestEntryRecord {
	const entries = Object.entries(value)
		.map(([key, entry]) => [key, sanitizeValue(entry)] as const)
		.sort(([left], [right]) => left.localeCompare(right));

	return Object.fromEntries(entries);
}

function sanitizeValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeValue(entry));
	}

	if (value && typeof value === 'object') {
		return sanitizeRecord(value as BlockManifestEntryRecord);
	}

	return value;
}

function normaliseString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function normaliseOptionalString(value: unknown): string | null | undefined {
	if (typeof value === 'undefined') {
		return undefined;
	}

	return normaliseString(value);
}
