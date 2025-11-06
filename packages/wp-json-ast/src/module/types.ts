import type { PhpStmt } from '@wpkernel/php-json-ast';

import type { ModuleNamespaceConfig } from '../common/module';
import type { BaseControllerMetadata, IndexFileMetadata } from '../types';

/**
 * @category WordPress AST
 */
export interface ModuleProgramFile<TMetadata> {
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: TMetadata;
	readonly statements: readonly PhpStmt[];
}

/**
 * @category WordPress AST
 */
export interface BaseControllerProgramConfig {
	readonly origin: string;
	readonly namespace: ModuleNamespaceConfig;
	readonly metadataName?: string;
}

/**
 * @category WordPress AST
 */
export type BaseControllerProgram = ModuleProgramFile<BaseControllerMetadata>;

/**
 * @category WordPress AST
 */
export interface ModuleIndexEntry {
	readonly className: string;
	readonly path: string;
}

/**
 * @category WordPress AST
 */
export type ModuleIndexAugmentor = (
	entries: readonly ModuleIndexEntry[]
) => readonly ModuleIndexEntry[];

/**
 * @category WordPress AST
 */
export interface IndexProgramConfig {
	readonly origin: string;
	readonly namespace: string | null;
	readonly entries: readonly ModuleIndexEntry[];
	readonly metadataName?: string;
	readonly augment?: readonly ModuleIndexAugmentor[];
}

/**
 * @category WordPress AST
 */
export type IndexProgram = ModuleProgramFile<IndexFileMetadata>;
