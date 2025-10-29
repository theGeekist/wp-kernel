import type {
	PhpExpr,
	PhpStmt,
	PhpStmtClassMethod,
	PhpStmtClass,
} from '@wpkernel/php-json-ast';

import type { ResourceControllerRouteMetadata } from '../types';
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
