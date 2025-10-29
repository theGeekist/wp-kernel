import type { PhpProgram } from '@wpkernel/php-json-ast';

import type {
	BlockManifestMetadata,
	BlockManifestValidationError,
	BlockRegistrarMetadata,
} from '../types';

export type BlockManifestEntryRecord = Record<string, unknown>;

export type BlockManifestMap = Record<string, BlockManifestEntryRecord>;

export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

export type BlockManifestEntries = Readonly<Record<string, BlockManifestEntry>>;

export interface BlockManifestConfig {
	readonly fileName?: string;
	readonly entries: BlockManifestEntries;
}

export interface BlockManifestMetadataResult {
	readonly manifest: BlockManifestMap;
	readonly errors: readonly BlockManifestValidationError[];
}

export interface BlockRenderTarget {
	readonly absolutePath: string;
	readonly relativePath: string;
}

export interface BlockRenderStubDescriptor {
	readonly blockKey: string;
	readonly manifest: Readonly<BlockManifestEntryRecord>;
	readonly target: BlockRenderTarget;
}

export interface BlockRenderStub extends BlockRenderTarget {
	readonly contents: string;
}

export interface BlockModuleFile<
	TMetadata extends BlockManifestMetadata | BlockRegistrarMetadata,
> {
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: TMetadata;
	readonly program: PhpProgram;
}

export type BlockManifestFile = BlockModuleFile<BlockManifestMetadata>;

export type BlockRegistrarFile = BlockModuleFile<BlockRegistrarMetadata>;

export type BlockModuleFileEntry = BlockModuleFile<
	BlockManifestMetadata | BlockRegistrarMetadata
>;

export interface BlockModuleResult {
	readonly files: readonly BlockModuleFileEntry[];
	readonly renderStubs: readonly BlockRenderStub[];
}

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

export interface BlockModuleConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly manifest: BlockManifestConfig;
	readonly registrarFileName?: string;
	readonly renderStubs?: readonly BlockRenderStubDescriptor[];
	readonly hooks?: BlockModuleHooks;
}
