export const WORKSPACE_DIRS = {
	'@wpkernel/pipeline': 'packages/pipeline',
	'@wpkernel/core': 'packages/core',
	'@wpkernel/ui': 'packages/ui',
	'@wpkernel/php-json-ast': 'packages/php-json-ast',
	'@wpkernel/wp-json-ast': 'packages/wp-json-ast',
	'@wpkernel/test-utils': 'packages/test-utils',
	'@wpkernel/e2e-utils': 'packages/e2e-utils',
	'@wpkernel/cli': 'packages/cli',
	'@wpkernel/create-wpk': 'packages/create-wpk',
	'examples/showcase': 'examples/showcase',
};

export const BASE_BUILD_ORDER = [
	'@wpkernel/pipeline',
	'@wpkernel/core',
	'@wpkernel/ui',
	'@wpkernel/php-json-ast',
	'@wpkernel/wp-json-ast',
	'@wpkernel/test-utils',
	'@wpkernel/e2e-utils',
	'@wpkernel/cli',
	'@wpkernel/create-wpk',
];

export const EXAMPLE_WORKSPACES = ['examples/showcase'];

export const PREBUILD_SETS = {
	'@wpkernel/cli': [
		'@wpkernel/pipeline',
		'@wpkernel/core',
		'@wpkernel/ui',
		'@wpkernel/php-json-ast',
		'@wpkernel/wp-json-ast',
	],
};
