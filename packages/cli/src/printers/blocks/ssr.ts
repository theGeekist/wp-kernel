import path from 'node:path';
import fs from 'node:fs/promises';
import { PhpFileBuilder } from '../php/builder.js';
import { appendGeneratedFileDocblock } from '../php/docblock.js';
import { renderPhpFile } from '../php/render.js';
import { assembleMethodTemplate, PHP_INDENT } from '../php/template.js';
import { sanitizeJson } from '../php/utils.js';
import { renderPhpReturn } from '../php/value-renderer.js';
import type { SSRBlockOptions, BlockPrinterResult } from './types.js';
import { validateBlockManifest } from './shared/template-helpers.js';
import type { IRBlock } from '../../ir/types.js';

interface ManifestEntry {
	directory: string;
	manifest: string;
	render?: string;
}

interface RenderResolution {
	absolutePath: string;
	relativePath: string;
	exists: boolean;
	declared: boolean;
}

type GeneratedFile = { path: string; content: string };

interface RenderOutcome {
	files: GeneratedFile[];
	warnings: string[];
	renderPath?: string;
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
	const generatedFiles: GeneratedFile[] = [];

	const sortedBlocks = [...blocks].sort((a, b) => a.key.localeCompare(b.key));

	for (const block of sortedBlocks) {
		const {
			entry,
			files: blockFiles,
			warnings: blockWarnings,
		} = await processBlock({
			block,
			projectRoot: options.projectRoot,
		});

		if (entry) {
			manifestEntries[block.key] = entry;
		}

		generatedFiles.push(...blockFiles);
		warnings.push(...blockWarnings);
	}

	if (Object.keys(manifestEntries).length === 0) {
		return { files: generatedFiles, warnings };
	}

	const manifestPath = path.join(
		options.outputDir,
		'build',
		'blocks-manifest.php'
	);
	const registrarPath = path.join(
		options.outputDir,
		'php',
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

	generatedFiles.push(
		{ path: manifestPath, content: manifestContent },
		{ path: registrarPath, content: registrarContent }
	);

	return {
		files: generatedFiles,
		warnings,
	};
}

async function createManifestEntry(options: {
	blockDirectory: string;
	manifestSource: string;
	manifest: unknown;
	projectRoot: string;
}): Promise<
	| {
			entry: ManifestEntry;
			warnings: string[];
			renderInfo?: RenderResolution;
	  }
	| undefined
> {
	const directory = toPosix(options.blockDirectory);
	const manifest = toPosix(options.manifestSource);

	const renderInfo = await resolveRenderPath({
		manifest: options.manifest,
		manifestSource: options.manifestSource,
		projectRoot: options.projectRoot,
	});

	const entry: ManifestEntry = {
		directory,
		manifest,
	};

	if (renderInfo) {
		entry.render = renderInfo.relativePath;
	}

	return { entry, warnings: [], renderInfo };
}

async function processBlock(options: {
	block: IRBlock;
	projectRoot: string;
}): Promise<{
	entry?: ManifestEntry;
	files: GeneratedFile[];
	warnings: string[];
}> {
	const { block, projectRoot } = options;
	const manifestPath = path.resolve(projectRoot, block.manifestSource);
	const files: GeneratedFile[] = [];
	const warnings: string[] = [];

	let raw: string;
	try {
		raw = await fs.readFile(manifestPath, 'utf8');
	} catch (error) {
		warnings.push(
			`Block "${block.key}": Unable to read manifest at ${block.manifestSource}: ${String(
				error
			)}`
		);
		return { files, warnings };
	}

	let manifest: unknown;
	try {
		manifest = JSON.parse(raw);
	} catch (error) {
		warnings.push(
			`Block "${block.key}": Invalid JSON in block manifest ${block.manifestSource}: ${String(
				error
			)}`
		);
		return { files, warnings };
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
		projectRoot,
	});

	if (!entryResult) {
		warnings.push(
			`Block "${block.key}" is marked as SSR but could not be processed.`
		);
		return { files, warnings };
	}

	const renderOutcome = await ensureRenderTemplate({
		block,
		manifest,
		projectRoot,
		renderInfo: entryResult.renderInfo,
	});

	files.push(...renderOutcome.files);
	warnings.push(...renderOutcome.warnings);

	if (renderOutcome.renderPath && !entryResult.entry.render) {
		entryResult.entry.render = renderOutcome.renderPath;
	}

	if (entryResult.warnings.length > 0) {
		warnings.push(
			...entryResult.warnings.map(
				(message) => `Block "${block.key}": ${message}`
			)
		);
	}

	return { entry: entryResult.entry, files, warnings };
}

async function resolveRenderPath(options: {
	manifest: unknown;
	manifestSource: string;
	projectRoot: string;
}): Promise<RenderResolution | undefined> {
	const manifestDir = path.resolve(
		options.projectRoot,
		path.dirname(options.manifestSource)
	);

	if (options.manifest && typeof options.manifest === 'object') {
		const data = options.manifest as Record<string, unknown>;
		const render = data.render;
		if (typeof render === 'string') {
			if (!render.startsWith('file:')) {
				return undefined;
			}

			const relative = render.slice('file:'.length).trim();
			const normalized = relative.startsWith('./')
				? relative.slice(2)
				: relative;
			const absolute = path.resolve(manifestDir, normalized);
			const exists = await fileExists(absolute);
			return {
				absolutePath: absolute,
				relativePath: toPosix(
					path.relative(options.projectRoot, absolute)
				),
				exists,
				declared: true,
			};
		}
	}

	const fallback = path.resolve(manifestDir, 'render.php');
	const exists = await fileExists(fallback);
	if (!exists) {
		return undefined;
	}

	return {
		absolutePath: fallback,
		relativePath: toPosix(path.relative(options.projectRoot, fallback)),
		exists,
		declared: false,
	};
}

async function ensureRenderTemplate(options: {
	block: IRBlock;
	manifest: unknown;
	projectRoot: string;
	renderInfo?: RenderResolution;
}): Promise<RenderOutcome> {
	if (manifestDeclaresRenderCallback(options.manifest)) {
		return { files: [], warnings: [] };
	}

	if (options.renderInfo) {
		if (!options.renderInfo.exists && options.renderInfo.declared) {
			return {
				files: [
					{
						path: options.renderInfo.absolutePath,
						content: createRenderStub({
							block: options.block,
							manifest: options.manifest,
						}),
					},
				],
				warnings: [
					`Block "${options.block.key}": render file declared in manifest was missing; created stub at ${options.renderInfo.relativePath}.`,
				],
				renderPath: options.renderInfo.relativePath,
			};
		}

		if (!options.renderInfo.exists) {
			return {
				files: [],
				warnings: [
					`Block "${options.block.key}": expected render template at ${options.renderInfo.relativePath} but it was not found.`,
				],
				renderPath: options.renderInfo.relativePath,
			};
		}

		return {
			files: [],
			warnings: [],
			renderPath: options.renderInfo.relativePath,
		};
	}

	const fallbackAbsolute = path.resolve(
		options.projectRoot,
		options.block.directory,
		'render.php'
	);
	const fallbackRelative = toPosix(
		path.relative(options.projectRoot, fallbackAbsolute)
	);
	const exists = await fileExists(fallbackAbsolute);

	if (exists) {
		return { files: [], warnings: [], renderPath: fallbackRelative };
	}

	return {
		files: [
			{
				path: fallbackAbsolute,
				content: createRenderStub({
					block: options.block,
					manifest: options.manifest,
				}),
			},
		],
		warnings: [
			`Block "${options.block.key}": render template was not declared and none was found; created stub at ${fallbackRelative}.`,
		],
		renderPath: fallbackRelative,
	};
}

function manifestDeclaresRenderCallback(manifest: unknown): boolean {
	if (!manifest || typeof manifest !== 'object') {
		return false;
	}

	const data = manifest as Record<string, unknown>;
	const render = data.render;

	if (typeof render !== 'string') {
		return false;
	}

	const trimmed = render.trim();

	if (trimmed.length === 0) {
		return false;
	}

	return !trimmed.startsWith('file:');
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

	builder.addUse('function register_block_type_from_metadata');

	builder.appendStatement('final class Register');
	builder.appendStatement('{');

	const methods = [
		assembleMethodTemplate({
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
					"$metadata_path = self::resolve_config_path( $plugin_root, $config, 'manifest' );"
				);
				body.line('        if ( ! $metadata_path ) {');
				body.line(
					'$metadata_path = self::resolve_directory_fallback( $plugin_root, $config );'
				);
				body.line('        }');
				body.line('        if ( ! $metadata_path ) {');
				body.line('                continue;');
				body.line('        }');
				body.blank();
				body.line(
					'$render_path = self::resolve_render_path( $plugin_root, $config );'
				);
				body.line('        if ( $render_path ) {');
				body.line('                register_block_type_from_metadata(');
				body.line('                        $metadata_path,');
				body.line(
					'                        self::build_render_arguments( $render_path )'
				);
				body.line('                );');
				body.line('                continue;');
				body.line('        }');
				body.blank();
				body.line(
					'        register_block_type_from_metadata( $metadata_path );'
				);
				body.line('}');
			},
		}),
		assembleMethodTemplate({
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
		assembleMethodTemplate({
			signature:
				'private static function resolve_render_path( string $root, array $config ): ?string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line(
					"$path = self::resolve_config_path( $root, $config, 'render' );"
				);
				body.line('if ( $path ) {');
				body.line('        return $path;');
				body.line('}');
				body.blank();
				body.line(
					'$directory = self::resolve_directory_fallback( $root, $config );'
				);
				body.line('if ( ! $directory ) {');
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line(
					"$candidate = $directory . DIRECTORY_SEPARATOR . 'render.php';"
				);
				body.line('if ( ! file_exists( $candidate ) ) {');
				body.line('        return null;');
				body.line('}');
				body.blank();
				body.line('return $candidate;');
			},
		}),
		assembleMethodTemplate({
			signature:
				'private static function build_render_arguments( string $render_path ): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('return [');
				body.line("        'render_callback' => static function (");
				body.line('                array $attributes = [],');
				body.line("                string $content = '',");
				body.line('                ?\\WP_Block $block = null');
				body.line('        ): string {');
				body.line(
					'                return self::render_template( $render_path, $attributes, $content, $block );'
				);
				body.line('        },');
				body.line('];');
			},
		}),
		assembleMethodTemplate({
			signature:
				'private static function render_template( string $render_path, array $attributes, string $content, ?\\WP_Block $block = null ): string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				body.line('if ( ! file_exists( $render_path ) ) {');
				body.line('        return $content;');
				body.line('}');
				body.blank();
				body.line('ob_start();');
				body.line('require $render_path;');
				body.blank();
				body.line('return (string) ob_get_clean();');
			},
		}),
		assembleMethodTemplate({
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
		assembleMethodTemplate({
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

function createRenderStub(options: {
	block: IRBlock;
	manifest: unknown;
}): string {
	const manifest = isRecord(options.manifest) ? options.manifest : undefined;

	const title = deriveTitle(options.block, manifest);
	const textdomain = deriveTextdomain(options.block, manifest);
	const message = `${title} - hello from a dynamic block!`;

	const escapedMessage = escapeForSingleQuotedPhp(message);
	const escapedDomain = escapeForSingleQuotedPhp(textdomain);

	return `<?php
/**
 * AUTO-GENERATED WPK STUB: safe to edit.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */
?>
<p <?php echo get_block_wrapper_attributes(); ?>>
\t<?php esc_html_e( '${escapedMessage}', '${escapedDomain}' ); ?>
</p>
`;
}

function deriveTitle(
	block: IRBlock,
	manifest: Record<string, unknown> | undefined
): string {
	const title =
		typeof manifest?.title === 'string' ? manifest.title.trim() : '';
	if (title.length > 0) {
		return title;
	}

	const [, slug] = block.key.split('/');
	if (!slug) {
		return 'Block';
	}

	return slug
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join(' ');
}

function deriveTextdomain(
	block: IRBlock,
	manifest: Record<string, unknown> | undefined
): string {
	const candidate =
		typeof manifest?.textdomain === 'string'
			? manifest.textdomain.trim()
			: '';
	if (candidate.length > 0) {
		return candidate;
	}

	const [namespace] = block.key.split('/');
	return namespace && namespace.length > 0 ? namespace : 'messages';
}

function escapeForSingleQuotedPhp(value: string): string {
	return value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch {
		return false;
	}
}
