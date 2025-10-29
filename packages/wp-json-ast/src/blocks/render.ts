import type { BlockRenderStub, BlockRenderStubDescriptor } from './types';

export function buildRenderStub(
	descriptor: BlockRenderStubDescriptor
): BlockRenderStub {
	return {
		absolutePath: descriptor.target.absolutePath,
		relativePath: descriptor.target.relativePath,
		contents: createRenderStub({
			blockKey: descriptor.blockKey,
			manifest: descriptor.manifest,
		}),
	};
}

function createRenderStub(options: {
	readonly blockKey: string;
	readonly manifest: Readonly<Record<string, unknown>>;
}): string {
	const title = deriveTitle(options);
	const textdomain = deriveTextdomain(options);
	const message = `${title} - hello from a dynamic block!`;

	const escapedMessage = escapeForSingleQuotedPhp(message);
	const escapedDomain = escapeForSingleQuotedPhp(textdomain);

	return `<?php\n/**\n * AUTO-GENERATED WPK STUB: safe to edit.\n *\n * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render\n */\n?>\n<p <?php echo get_block_wrapper_attributes(); ?>>\n\t<?php esc_html_e( '${escapedMessage}', '${escapedDomain}' ); ?>\n</p>\n`;
}

function deriveTitle(options: {
	readonly blockKey: string;
	readonly manifest: Readonly<Record<string, unknown>>;
}): string {
	const titleValue = options.manifest.title;
	if (typeof titleValue === 'string' && titleValue.trim().length > 0) {
		return titleValue.trim();
	}

	const [, slug] = options.blockKey.split('/');
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

function deriveTextdomain(options: {
	readonly blockKey: string;
	readonly manifest: Readonly<Record<string, unknown>>;
}): string {
	const textdomainValue = options.manifest.textdomain;
	if (
		typeof textdomainValue === 'string' &&
		textdomainValue.trim().length > 0
	) {
		return textdomainValue.trim();
	}

	const [namespace] = options.blockKey.split('/');
	return namespace && namespace.length > 0 ? namespace : 'messages';
}

function escapeForSingleQuotedPhp(value: string): string {
	return value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'");
}
