import {
	buildDeclare,
	buildDeclareItem,
	buildReturn,
	buildScalarInt,
	type PhpProgram,
} from '@wpkernel/php-json-ast';

import { buildBlockManifestDocblock } from '../common/docblock';
import { buildBlockManifestMetadata } from '../common/metadata/block';
import { renderPhpValue } from '../resource/common/phpValue';
import type { BlockManifestConfig, BlockModuleFile } from './types';
import { buildGuardedBlock, withGeneratedDocComment } from './utils';
import type { BlockManifestValidationError } from '../types';

const DEFAULT_MANIFEST_FILE = 'build/blocks-manifest.php';

export interface BlockManifestMetadataResult {
	readonly manifest: Record<string, Record<string, unknown>>;
	readonly errors: readonly BlockManifestValidationError[];
}

export function buildManifestMetadata(
	entries: Readonly<Record<string, BlockManifestConfig['entries'][string]>>
): BlockManifestMetadataResult {
	const errors: BlockManifestValidationError[] = [];
	const manifestEntries: Array<readonly [string, Record<string, unknown>]> =
		[];

	for (const [blockKey, entry] of Object.entries(entries)) {
		const sanitised = sanitizeEntry(blockKey, entry, errors);
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

export function buildBlockManifestFile(
	origin: string,
	config: BlockManifestConfig
): BlockModuleFile<ReturnType<typeof buildBlockManifestMetadata>> {
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
	} satisfies BlockModuleFile<typeof metadata>;
}

function buildManifestProgram({
	docblock,
	manifest,
}: {
	readonly docblock: readonly string[];
	readonly manifest: Record<string, Record<string, unknown>>;
}): PhpProgram {
	const strictTypes = buildDeclare([
		buildDeclareItem('strict_types', buildScalarInt(1)),
	]);

	const returnStatement = withGeneratedDocComment(
		buildReturn(
			renderPhpValue(manifest as unknown as Record<string, unknown>)
		),
		docblock
	);

	return [strictTypes, ...buildGuardedBlock([returnStatement])];
}

function sanitizeEntry(
	blockKey: string,
	entry: BlockManifestConfig['entries'][string],
	errors: BlockManifestValidationError[]
): Record<string, unknown> | null {
	const manifest: Record<string, unknown> = {};

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
	value: Record<string, unknown>
): Record<string, unknown> {
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
		return sanitizeRecord(value as Record<string, unknown>);
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
