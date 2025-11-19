import {
	buildAssign,
	buildBinaryOperation,
	buildDeclare,
	buildDeclareItem,
	buildDocComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildReturn,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	buildClosure,
	buildParam,
	buildArg,
	type PhpProgram,
} from '@wpkernel/php-json-ast';
import type { BlockRenderStub, BlockRenderStubDescriptor } from './types';
interface RenderStubTemplateOptions {
	readonly blockKey: string;
	readonly manifest: BlockRenderStubDescriptor['manifest'];
}

/**
 * @param    descriptor
 * @category WordPress AST
 */
export function buildRenderStub(
	descriptor: BlockRenderStubDescriptor
): BlockRenderStub {
	return {
		absolutePath: descriptor.target.absolutePath,
		relativePath: descriptor.target.relativePath,
		program: createRenderStubProgram({
			blockKey: descriptor.blockKey,
			manifest: descriptor.manifest,
		}),
	};
}

function createRenderStubProgram(options: {
	readonly blockKey: string;
	readonly manifest: BlockRenderStubDescriptor['manifest'];
}): PhpProgram {
	const title = deriveTitle(options);
	const textdomain = deriveTextdomain(options);
	const message = `${title} - hello from a dynamic block!`;

	const docblock = buildDocComment([
		'AUTO-GENERATED WPK STUB: safe to edit.',
		'',
		'@see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render',
	]);

	const wrapperAssign = buildAssign(
		buildVariable('wrapper'),
		buildFuncCall(buildName(['get_block_wrapper_attributes']))
	);

	const bodyAssign = buildAssign(
		buildVariable('body'),
		buildFuncCall(buildName(['esc_html__']), [
			buildArg(buildScalarString(message)),
			buildArg(buildScalarString(textdomain)),
		])
	);

	const returnExpr = buildBinaryOperation(
		'Concat',
		buildBinaryOperation(
			'Concat',
			buildBinaryOperation(
				'Concat',
				buildScalarString('<p '),
				buildVariable('wrapper')
			),
			buildBinaryOperation(
				'Concat',
				buildScalarString('>'),
				buildVariable('body')
			)
		),
		buildScalarString('</p>')
	);

	const renderClosure = buildClosure({
		params: [
			buildParam(buildVariable('attributes'), {
				type: buildIdentifier('array'),
			}),
			buildParam(buildVariable('content'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('block'), {
				type: buildName(['WP_Block']),
			}),
		],
		returnType: buildIdentifier('string'),
		stmts: [
			buildExpressionStatement(wrapperAssign),
			buildExpressionStatement(bodyAssign),
			buildReturn(returnExpr),
		],
	});

	return [
		buildDeclare([buildDeclareItem('strict_types', buildScalarInt(1))]),
		buildStmtNop({ comments: [docblock] }),
		buildReturn(renderClosure),
	];
}

function deriveTitle(options: RenderStubTemplateOptions): string {
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

function deriveTextdomain(options: RenderStubTemplateOptions): string {
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
