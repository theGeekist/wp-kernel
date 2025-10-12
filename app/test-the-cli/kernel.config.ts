import type {
	ResourceConfig,
	ResourceIdentityConfig,
	ResourceRoutes,
	ResourceStorageConfig,
} from '@geekist/wp-kernel/resource';

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

const exampleResource: ResourceConfig<ExampleItem, ExampleQuery> = {
	name: 'example-item',
	identity,
	storage,
	routes,
	schema: 'auto',
};

// For CLI config guidance see https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety
export const kernelConfig = {
	version: 1,
	namespace: 'wp-kernel-cli-sample',
	schemas: {},
	resources: {
		example: exampleResource,
	},
};

export type TestCliKernelConfig = typeof kernelConfig;
