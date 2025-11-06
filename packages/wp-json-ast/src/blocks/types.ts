import type { PhpProgram } from '@wpkernel/php-json-ast';

import type {
	BlockManifestMetadata,
	BlockManifestValidationError,
	BlockRegistrarMetadata,
} from '../types';

/**
 * @category WordPress AST
 */
export type BlockManifestEntryRecord = Record<string, unknown>;

/**
 * @category WordPress AST
 */
export type BlockManifestMap = Record<string, BlockManifestEntryRecord>;

/**
 * @category WordPress AST
 */
export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

/**
 * @category WordPress AST
 */
export type BlockManifestEntries = Readonly<Record<string, BlockManifestEntry>>;

/**
 * @category WordPress AST
 */
export interface BlockManifestConfig {
	readonly fileName?: string;
	readonly entries: BlockManifestEntries;
}

/**
 * @category WordPress AST
 */
export interface BlockManifestMetadataResult {
	readonly manifest: BlockManifestMap;
	readonly errors: readonly BlockManifestValidationError[];
}

/**
 * @category WordPress AST
 */
export interface BlockRenderTarget {
	readonly absolutePath: string;
	readonly relativePath: string;
}

/**
 * @category WordPress AST
 */
export interface BlockRenderStubDescriptor {
	readonly blockKey: string;
	readonly manifest: Readonly<BlockManifestEntryRecord>;
	readonly target: BlockRenderTarget;
}

/**
 * @category WordPress AST
 */
export interface BlockRenderStub extends BlockRenderTarget {
	readonly contents: string;
}

/**
 * @category WordPress AST
 */
export interface BlockModuleFile<
	TMetadata extends BlockManifestMetadata | BlockRegistrarMetadata,
> {
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: TMetadata;
	readonly program: PhpProgram;
}

/**
 * @category WordPress AST
 */
export type BlockManifestFile = BlockModuleFile<BlockManifestMetadata>;

/**
 * @category WordPress AST
 */
export type BlockRegistrarFile = BlockModuleFile<BlockRegistrarMetadata>;

/**
 * @category WordPress AST
 */
export type BlockModuleFileEntry = BlockModuleFile<
	BlockManifestMetadata | BlockRegistrarMetadata
>;

/**
 * @category WordPress AST
 */
export interface BlockModuleResult {
	readonly files: readonly BlockModuleFileEntry[];
	readonly renderStubs: readonly BlockRenderStub[];
}

/**
 * @category WordPress AST
 */
export interface BlockModuleHooks {
	readonly manifestFile?: (
		file: BlockManifestFile
	) => BlockManifestFile | void;
	readonly registrarFile?: (
		file: BlockRegistrarFile
	) => BlockRegistrarFile | void;
	readonly renderStub?: (
		stub: BlockRenderStub,
		descriptor: BlockRenderStubDescriptor
	) => BlockRenderStub | void;
}

/**
 * @category WordPress AST
 */
export interface BlockModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly manifest: BlockManifestConfig;
	readonly registrarFileName?: string;
	readonly renderStubs?: readonly BlockRenderStubDescriptor[];
	readonly hooks?: BlockModuleHooks;
}
