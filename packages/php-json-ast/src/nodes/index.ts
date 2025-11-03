export * from './base';
export * from './comments';
export * from './identifier';
export * from './name';
export * from './types';
export * from './attributes';
export * from './arguments';
export * from './params';
export * from './const';
export * from './declareItem';
export * from './scalar';
export * from './expressions';
export * from './stmt';
export * from './propertyHook';

import type { PhpArg } from './arguments';
import type { PhpAttrGroup, PhpAttribute } from './attributes';
import type { PhpConst } from './const';
import type { PhpExpr, PhpMatchArm, PhpClosureUse } from './expressions';
import type { PhpScalar } from './scalar';
import type { PhpStmt } from './stmt';
import type { PhpType } from './types';
import type { PhpParam } from './params';
import type { PhpPropertyHook } from './propertyHook';

export type PhpNodeLike =
	| PhpStmt
	| PhpExpr
	| PhpScalar
	| PhpType
	| PhpAttribute
	| PhpAttrGroup
	| PhpParam
	| PhpArg
	| PhpConst
	| PhpClosureUse
	| PhpMatchArm
	| PhpPropertyHook;
