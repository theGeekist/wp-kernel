import type {
	PhpExpr,
	PhpProgram,
	PhpStmt,
	PhpStmtClass,
	PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import type {
	BaseControllerMetadata,
	ResourceControllerMetadata,
	ResourceControllerRouteMetadata,
} from '../types';
import type { RequestParamAssignmentOptions } from '../common/request';

export interface RestRouteRequestParameter
	extends Omit<RequestParamAssignmentOptions, 'requestVariable'> {
	readonly requestVariable?: string;
}

export interface RestRouteConfig {
	readonly methodName: string;
	readonly metadata: ResourceControllerRouteMetadata;
	readonly capability?: string;
	readonly docblockSummary?: string;
	readonly usesIdentity?: boolean;
	readonly requestParameters?: readonly RestRouteRequestParameter[];
	readonly statements: readonly PhpStmt[];
}

export interface RestControllerIdentity {
	readonly type: 'number' | 'string';
	readonly param: string;
}

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

export interface RestControllerClassBuildResult {
	readonly classNode: PhpStmtClass;
	readonly uses: readonly string[];
}

export interface RestRouteIdentityPlan {
	readonly identity: RestControllerIdentity;
	readonly route: RestRouteConfig;
}

export interface RestControllerImportDerivationOptions {
	readonly capabilityClass?: string;
	readonly helperMethods?: readonly PhpStmtClassMethod[];
}

export interface RestControllerModuleControllerConfig
	extends RestControllerClassConfig {
	readonly resourceName: string;
	readonly schemaProvenance: string;
	readonly fileName: string;
	readonly metadata?: ResourceControllerMetadata;
}

export interface RestControllerModuleIndexEntry {
	readonly className: string;
	readonly path: string;
}

export interface RestControllerModuleFile {
	readonly fileName: string;
	readonly namespace: string | null;
	readonly docblock: readonly string[];
	readonly metadata:
		| BaseControllerMetadata
		| ResourceControllerMetadata
		| { readonly kind: 'index-file' };
	readonly program: PhpProgram;
}

export interface RestControllerModuleResult {
	readonly files: readonly RestControllerModuleFile[];
}

export interface RestControllerModuleConfig {
	readonly origin: string;
	readonly sanitizedNamespace: string;
	readonly namespace: string;
	readonly controllers: readonly RestControllerModuleControllerConfig[];
	readonly additionalIndexEntries?: readonly RestControllerModuleIndexEntry[];
	readonly baseControllerFileName?: string;
	readonly includeBaseController?: boolean;
}
