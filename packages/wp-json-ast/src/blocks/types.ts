import type { PhpProgram } from '@wpkernel/php-json-ast';

import type { BlockManifestMetadata, BlockRegistrarMetadata } from '../types';

export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

export interface BlockManifestConfig {
	readonly fileName?: string;
	readonly entries: Readonly<Record<string, BlockManifestEntry>>;
}

export interface BlockRenderTarget {
	readonly absolutePath: string;
	readonly relativePath: string;
}

export interface BlockRenderStubDescriptor {
	readonly blockKey: string;
	readonly manifest: Readonly<Record<string, unknown>>;
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

export interface BlockModuleResult {
	readonly files: readonly BlockModuleFile<
		BlockManifestMetadata | BlockRegistrarMetadata
	>[];
	readonly renderStubs: readonly BlockRenderStub[];
}

export interface BlockModuleHooks {
	readonly manifestFile?: (
		file: BlockModuleFile<BlockManifestMetadata>
	) => BlockModuleFile<BlockManifestMetadata> | void;
	readonly registrarFile?: (
		file: BlockModuleFile<BlockRegistrarMetadata>
	) => BlockModuleFile<BlockRegistrarMetadata> | void;
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
