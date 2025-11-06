import type {
	PhpExpr,
	PhpProgram,
	PhpStmt,
	PhpStmtClass,
	PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import type {
	BaseControllerMetadata,
	IndexFileMetadata,
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../types';
import type { RequestParamAssignmentOptions } from '../common/request';
import type { ModuleIndexEntry } from '../module/types';

/**
 * @category WordPress AST
 */
export interface RestRouteRequestParameter
	extends Omit<RequestParamAssignmentOptions, 'requestVariable'> {
	readonly requestVariable?: string;
}

/**
 * @category WordPress AST
 */
export interface RestRouteConfig {
	readonly methodName: string;
	readonly metadata: ResourceControllerRouteMetadata;
	readonly capability?: string;
	readonly docblockSummary?: string;
	readonly usesIdentity?: boolean;
	readonly requestParameters?: readonly RestRouteRequestParameter[];
	readonly statements: readonly PhpStmt[];
}

/**
 * @category WordPress AST
 */
export interface RestControllerIdentity {
	readonly type: 'number' | 'string';
	readonly param: string;
}

/**
 * @category WordPress AST
 */
export interface RestControllerClassConfig {
	readonly className: string;
	readonly resourceName: string;
	readonly schemaKey: string;
	readonly restArgsExpression: PhpExpr;
	readonly identity: RestControllerIdentity;
	readonly routes: readonly RestRouteConfig[];
	readonly helperMethods?: readonly PhpStmtClassMethod[];
	readonly capabilityClass?: string;
}

/**
 * @category WordPress AST
 */
export interface RestControllerClassBuildResult {
	readonly classNode: PhpStmtClass;
	readonly uses: readonly string[];
}

/**
 * @category WordPress AST
 */
export interface RestRouteIdentityPlan {
	readonly identity: RestControllerIdentity;
	readonly route: RestRouteConfig;
}

/**
 * @category WordPress AST
 */
export interface RestControllerImportDerivationOptions {
	readonly capabilityClass?: string;
	readonly helperMethods?: readonly PhpStmtClassMethod[];
}

/**
 * @category WordPress AST
 */
export interface RestControllerModuleControllerConfig
	extends RestControllerClassConfig {
	readonly resourceName: string;
	readonly schemaProvenance: string;
	readonly fileName: string;
	readonly metadata?: ResourceControllerMetadata;
}

/**
 * @category WordPress AST
 */
export type RestControllerModuleIndexEntry = ModuleIndexEntry;

/**
 * @category WordPress AST
 */
export type RestControllerModuleMetadata =
	| BaseControllerMetadata
	| ResourceControllerMetadata
	| IndexFileMetadata;

/**
 * @category WordPress AST
 */
export interface RestControllerModuleFile {
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata: RestControllerModuleMetadata;
	readonly program: PhpProgram;
}

/**
 * @category WordPress AST
 */
export interface RestControllerModuleResult {
	readonly files: readonly RestControllerModuleFile[];
}

/**
 * @category WordPress AST
 */
export interface RestControllerModuleConfig {
	readonly origin: string;
	readonly sanitizedNamespace: string;
	readonly namespace: string;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalIndexEntries?: readonly RestControllerModuleIndexEntry[];
	readonly baseControllerFileName?: string;
	readonly includeBaseController?: boolean;
}

/**
 * @category WordPress AST
 */
export interface RestControllerIndexEntriesOptions {
	readonly namespace: string;
	readonly includeBase: boolean;
	readonly baseControllerFileName: string;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalEntries: readonly RestControllerModuleIndexEntry[];
}
