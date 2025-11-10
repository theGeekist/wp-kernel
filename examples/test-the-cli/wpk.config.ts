import {
	type ResourceConfigInput,
	type ResourceIdentityConfig,
	type ResourceRoutes,
	type ResourceStorageConfig,
} from '@wpkernel/core';

type ExampleItem = {
	id: number;
	name: string;
};

type ExampleQuery = {
	search?: string;
};

const identity: ResourceIdentityConfig = {
	type: 'number',
	param: 'id',
};

const storage: ResourceStorageConfig = {
	mode: 'transient',
};

const routes: ResourceRoutes = {
	list: {
		path: '/example/v1/items',
		method: 'GET',
	},
	get: {
		path: '/example/v1/items/:id',
		method: 'GET',
	},
};

const exampleResource: ResourceConfigInput<ExampleItem, ExampleQuery> = {
	identity,
	storage,
	routes,
	schema: 'auto',
};

const exampleResources = {
	example: exampleResource,
} satisfies Record<'example', ResourceConfigInput<ExampleItem, ExampleQuery>>;

/** @see https://github.com/wpkernel/wpkernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules */
export const wpkConfig = {
	version: 1,
	namespace: 'wp-kernel-cli-sample',
	schemas: {},
	resources: exampleResources,
};

export type TestCliWPKernelConfig = typeof wpkConfig;
