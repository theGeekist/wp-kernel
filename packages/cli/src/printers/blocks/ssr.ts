import path from 'node:path';
import fs from 'node:fs/promises';
import { PhpFileBuilder } from '../php/builder.js';
import { appendGeneratedFileDocblock } from '../php/docblock.js';
import { renderPhpFile } from '../php/render.js';
import { createMethodTemplate, PHP_INDENT } from '../php/template.js';
import { sanitizeJson } from '../php/utils.js';
import { renderPhpReturn } from '../php/value-renderer.js';
import type { SSRBlockOptions, BlockPrinterResult } from './types.js';
import { validateBlockManifest } from './shared/template-helpers.js';

interface ManifestEntry {
	directory: string;
	manifest: string;
	render?: string;
}

/**
 * Generate SSR block manifest and registrar.
 *
 * Creates:
 * 1. PHP manifest file listing all SSR blocks with metadata
 * 2. PSR-4 compliant registrar class that loads and registers blocks
 *
 * @param options - Configuration for SSR block generation
 * @return Generated files and warnings
 * @internal
 */
export async function generateSSRBlocks(
	options: SSRBlockOptions
): Promise<BlockPrinterResult> {
	const blocks = options.blocks.filter((block) => block.hasRender);

	if (blocks.length === 0) {
		return { files: [], warnings: [] };
	}

	const manifestEntries: Record<string, ManifestEntry> = {};
	const warnings: string[] = [];

	const sortedBlocks = [...blocks].sort((a, b) => a.key.localeCompare(b.key));

	for (const block of sortedBlocks) {
		const manifestPath = path.resolve(
			options.projectRoot,
			block.manifestSource
		);

		let manifest: unknown;
		try {
			const raw = await fs.readFile(manifestPath, 'utf8');
			manifest = JSON.parse(raw);
		} catch (error) {
			warnings.push(
				`Unable to read manifest for block "${block.key}" at ${block.manifestSource}: ${String(
					error
				)}`
			);
			continue;
		}

		warnings.push(
			...validateBlockManifest(manifest, block).map(
				(message) => `Block "${block.key}": ${message}`
			)
		);

		const entryResult = await createManifestEntry({
			blockDirectory: block.directory,
			manifestSource: block.manifestSource,
			manifest,
			projectRoot: options.projectRoot,
		});

		if (!entryResult) {
			warnings.push(
				`Block "${block.key}" is marked as SSR but could not be processed.`
			);
			continue;
		}

		if (entryResult.warnings.length > 0) {
			warnings.push(
				...entryResult.warnings.map(
					(message) => `Block "${block.key}": ${message}`
				)
			);
		}

		manifestEntries[block.key] = entryResult.entry;
	}

	if (Object.keys(manifestEntries).length === 0) {
		return { files: [], warnings };
	}

	const manifestPath = path.join(
		options.outputDir,
		'build',
		'blocks-manifest.php'
	);
	const registrarPath = path.join(
		options.outputDir,
		'inc',
		'Blocks',
		'Register.php'
	);

	const manifestContent = renderManifestFile({
		entries: manifestEntries,
		source: options.source ?? 'project config',
	});

	const registrarContent = renderRegistrarFile({
		namespaceRoot: options.phpNamespace ?? 'Project',
		source: options.source ?? 'project config',
	});

	return {
		files: [
			{ path: manifestPath, content: manifestContent },
			{ path: registrarPath, content: registrarContent },
		],
		warnings,
	};
}

async function createManifestEntry(options: {
	blockDirectory: string;
	manifestSource: string;
	manifest: unknown;
	projectRoot: string;
}): Promise<{ entry: ManifestEntry; warnings: string[] } | undefined> {
	const directory = toPosix(options.blockDirectory);
	const manifest = toPosix(options.manifestSource);

	const { path: renderPath, warning } = await resolveRenderPath(options);

	const entry: ManifestEntry = {
		directory,
		manifest,
	};

	if (renderPath) {
		entry.render = toPosix(path.relative(options.projectRoot, renderPath));
	}

	const warnings = warning ? [warning] : [];

	return { entry, warnings };
}

async function resolveRenderPath(options: {
	manifest: unknown;
	manifestSource: string;
	projectRoot: string;
	blockDirectory: string;
}): Promise<{ path?: string; warning?: string }> {
	const manifestDir = path.resolve(
		options.projectRoot,
		path.dirname(options.manifestSource)
	);

	const manifest = options.manifest;
	if (manifest && typeof manifest === 'object') {
		const data = manifest as Record<string, unknown>;
		const render = data.render;
		if (typeof render === 'string' && render.startsWith('file:')) {
			const relative = render.slice('file:'.length).trim();
			const normalized = relative.startsWith('./')
				? relative.slice(2)
				: relative;
			const absolute = path.resolve(manifestDir, normalized);
			if (await fileExists(absolute)) {
				return { path: absolute };
			}

			return {
				warning: `render file declared in manifest was not found at ${toPosix(
					path.relative(options.projectRoot, absolute)
				)}.`,
			};
		}
	}

	const fallback = path.resolve(manifestDir, 'render.php');
	if (await fileExists(fallback)) {
		return { path: fallback };
	}

	return {};
}

function renderManifestFile(options: {
	entries: Record<string, ManifestEntry>;
	source: string;
}): string {
	const builder = new PhpFileBuilder('', { kind: 'block-manifest' });

	appendGeneratedFileDocblock(builder, [
		`Source: ${options.source} → blocks.ssr.manifest`,
	]);

	const payload = sanitizeJson(options.entries);
	const lines = renderPhpReturn(payload, 0);
	lines.forEach((line) => builder.appendStatement(line));

	return renderPhpFile(builder.toAst());
}

function renderRegistrarFile(options: {
	namespaceRoot: string;
	source: string;
}): string {
	const namespace = formatNamespace(options.namespaceRoot);
	const builder = new PhpFileBuilder(namespace, { kind: 'block-registrar' });

	appendGeneratedFileDocblock(builder, [
		`Source: ${options.source} → blocks.ssr.register`,
	]);

	builder.addUse('function register_block_type');

	builder.appendStatement('final class Register');
	builder.appendStatement('{');

	const methods = [
		createMethodTemplate({
			signature: 'public static function register(): void',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					"$manifest_path = dirname(__DIR__, 2) . '/build/blocks-manifest.php';"
				);
				body.blank();
				body.line('if ( ! file_exists( $manifest_path ) ) {');
				body.line('        return;');
				body.line('}');
				body.blank();
				body.line('$entries = require $manifest_path;');
				body.line('if ( ! is_array( $entries ) ) {');
				body.line('        return;');
				body.line('}');
				body.blank();
				body.line('$plugin_root = dirname(__DIR__, 2);');
				body.blank();
				body.line('foreach ( $entries as $block => $config ) {');
				body.line('        if ( ! is_array( $config ) ) {');
				body.line('                continue;');
				body.line('        }');
				body.blank();
				body.line(
					"$metadata = self::resolve_config_path( $plugin_root, $config, 'manifest' );"
				);
				body.line('        if ( ! $metadata ) {');
				body.line(
					'$metadata = self::resolve_directory_fallback( $plugin_root, $config );'
				);
				body.line('        }');
				body.line('        if ( ! $metadata ) {');
				body.line('                continue;');
				body.line('        }');
				body.blank();
				body.line('        register_block_type( $metadata );');
				body.line('}');
			},
		}),
		createMethodTemplate({
			signature:
				'private static function resolve_config_path( string $root, array $config, string $key ): ?string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					'if ( empty( $config[ $key ] ) || ! is_string( $config[ $key ] ) ) {'
				);
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line(
					'$path = self::normalise_relative( $root, $config[ $key ] );'
				);
				body.line('if ( ! file_exists( $path ) ) {');
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line('return $path;');
			},
		}),
		createMethodTemplate({
			signature:
				'private static function resolve_directory_fallback( string $root, array $config ): ?string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					"if ( empty( $config['directory'] ) || ! is_string( $config['directory'] ) ) {"
				);
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line(
					"$path = self::normalise_relative( $root, $config['directory'] );"
				);
				body.line('if ( ! file_exists( $path ) ) {');
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line('return $path;');
			},
		}),
		createMethodTemplate({
			signature:
				'private static function normalise_relative( string $root, string $relative ): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('$trimmed = ltrim( $relative, "/" );');
				body.line(
					'$normalised = str_replace( "/", DIRECTORY_SEPARATOR, $trimmed );'
				);
				body.line(
					'return rtrim( $root, "/\\" ) . DIRECTORY_SEPARATOR . $normalised;'
				);
			},
		}),
	];

	for (let index = 0; index < methods.length; index += 1) {
		const method = methods[index]!;
		method.forEach((line) => builder.appendStatement(line));
		if (index < methods.length - 1) {
			builder.appendStatement('');
		}
	}

	builder.appendStatement('}');

	return renderPhpFile(builder.toAst());
}

function formatNamespace(candidate: string): string {
	return candidate.endsWith('\\Blocks')
		? candidate
		: `${candidate.replace(/\\$/u, '')}\\Blocks`;
}

function toPosix(candidate: string): string {
	return candidate.split(path.sep).join('/');
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch {
		return false;
	}
}
