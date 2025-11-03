import type { PhpStmt } from '@wpkernel/php-json-ast';

import type { ModuleNamespaceConfig } from '../common/module';
import type { BaseControllerMetadata, IndexFileMetadata } from '../types';

export interface ModuleProgramFile<TMetadata> {
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: TMetadata;
	readonly statements: readonly PhpStmt[];
}

export interface BaseControllerProgramConfig {
	readonly origin: string;
	readonly namespace: ModuleNamespaceConfig;
	readonly metadataName?: string;
}

export type BaseControllerProgram = ModuleProgramFile<BaseControllerMetadata>;

export interface ModuleIndexEntry {
	readonly className: string;
	readonly path: string;
}

export type ModuleIndexAugmentor = (
	entries: readonly ModuleIndexEntry[]
) => readonly ModuleIndexEntry[];

export interface IndexProgramConfig {
	readonly origin: string;
	readonly namespace: string | null;
	readonly entries: readonly ModuleIndexEntry[];
	readonly metadataName?: string;
	readonly augment?: readonly ModuleIndexAugmentor[];
}

export type IndexProgram = ModuleProgramFile<IndexFileMetadata>;
