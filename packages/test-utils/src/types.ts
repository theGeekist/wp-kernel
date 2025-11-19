import type {
	LoadedWPKernelConfig,
	WPKernelConfigV1,
	SchemaRegistry,
	SchemaConfig,
	ResourceRegistry,
	SerializableResourceConfig,
	ConfigOrigin,
} from '@wpkernel/cli/config/types';
import type {
	IRv1,
	IRRoute,
	IRResource,
	IRResourceCacheKey,
	IRWarning,
} from '@wpkernel/cli/ir/publicTypes';
export type {
	IRBlock,
	IRCapabilityDefinition,
	IRHashProvenance,
	IRResource,
	IRRoute,
	IRv1,
} from '@wpkernel/cli/ir/publicTypes';
import type { Workspace, FileManifest } from '@wpkernel/cli/workspace';
// Pipeline doesn't export these; retype locally for test helpers.
export interface BuilderWriteActionLike<TContents = Buffer | string> {
	readonly file: string;
	readonly contents: TContents;
}

export interface BuilderOutputLike<
	TAction extends BuilderWriteActionLike = BuilderWriteActionLike,
> {
	readonly actions: TAction[];
	queueWrite: (action: TAction) => void;
	flush?: () => Promise<void>;
}

export type SchemaConfigLike = SchemaConfig;
export type SchemaRegistryLike = SchemaRegistry;
export type ResourceConfigLike = SerializableResourceConfig;
export type ResourceRegistryLike = ResourceRegistry;
export type WPKConfigV1Like<
	TSchemas extends SchemaRegistryLike = SchemaRegistryLike,
	TResources extends ResourceRegistryLike = ResourceRegistryLike,
	TAdapters = unknown,
> = WPKernelConfigV1 & {
	schemas: TSchemas;
	resources: TResources;
	adapters?: TAdapters;
};
export type LoadedWPKConfigV1Like<
	TConfig extends WPKConfigV1Like = WPKConfigV1Like,
	TOrigin extends ConfigOrigin = ConfigOrigin,
> = LoadedWPKernelConfig & {
	config: TConfig;
	configOrigin: TOrigin;
};

export type IRRouteLike<
	TMethod extends string = string,
	TTransport extends string = string,
	TCapability = string | undefined,
> = IRRoute & {
	method: TMethod;
	transport: TTransport;
	capability?: TCapability;
};

export type IRResourceCacheKeyLike<
	TSegments extends readonly unknown[] = readonly unknown[],
	TSource extends IRResourceCacheKey['source'] = IRResourceCacheKey['source'],
> = IRResourceCacheKey & {
	segments: TSegments;
	source: TSource;
};

export type IRWarningLike<
	TContext extends Record<string, unknown> = Record<string, unknown>,
> = IRWarning & {
	context?: TContext;
};

export type IRResourceLike<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = unknown,
	TStorage = unknown,
	TQueryParams = unknown,
	TUi = unknown,
	TWarning extends IRWarningLike = IRWarningLike,
> = IRResource & {
	routes: TRoute[];
	cacheKeys: {
		list: TCacheKey;
		get: TCacheKey;
		create?: TCacheKey;
		update?: TCacheKey;
		remove?: TCacheKey;
	};
	identity?: TIdentity;
	storage?: TStorage;
	queryParams?: TQueryParams;
	ui?: TUi;
	warnings: readonly TWarning[];
};

export type IRMetaLike<TVersion extends number = number> = IRv1['meta'] & {
	version: TVersion;
};

export type IRv1Like<
	TConfig = WPKConfigV1Like,
	TSchema = unknown,
	TRoute extends IRRouteLike = IRRouteLike,
	TResource extends IRResourceLike<TRoute> = IRResourceLike<TRoute>,
	TCapabilityHint = unknown,
	TCapabilityMap = unknown,
	TBlock = unknown,
	TPhpProject = unknown,
	TDiagnostic = IRWarningLike,
> = IRv1 & {
	config: TConfig;
	schemas: TSchema[];
	resources: TResource[];
	capabilities: TCapabilityHint[];
	capabilityMap: TCapabilityMap;
	blocks: TBlock[];
	php: TPhpProject;
	diagnostics?: readonly TDiagnostic[];
};

export interface BuildIrOptionsLike<TConfig = WPKConfigV1Like> {
	readonly config: TConfig;
	readonly namespace: string;
	readonly origin: string;
	readonly sourcePath: string;
}

export type WorkspaceFileManifestLike = FileManifest;
export type WorkspaceWriteOptionsLike = Parameters<Workspace['write']>[2];
export type WorkspaceWriteJsonOptionsLike = Parameters<
	Workspace['writeJson']
>[2];
export type WorkspaceRemoveOptionsLike = Parameters<Workspace['rm']>[1];
export type WorkspaceMergeOptionsLike = Parameters<
	Workspace['threeWayMerge']
>[4];

export type WorkspaceLike = Workspace & {
	resolve?: (...parts: string[]) => string;
	exists?: (target: string) => Promise<boolean>;
};
