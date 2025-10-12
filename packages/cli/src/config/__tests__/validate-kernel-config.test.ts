import { KernelError } from '@geekist/wp-kernel/error';
import type { Reporter, ResourceConfig } from '@geekist/wp-kernel';
import {
	validateKernelConfig,
	resourceRoutesValidator,
	normalizeVersion,
	runResourceChecks,
	formatValidationErrors,
} from '../validate-kernel-config';

interface TestResourceConfig {
	name: string;
	routes: {
		list?: {
			path: string;
			method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
			policy?: string;
		};
		get?: {
			path: string;
			method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
			policy?: string;
		};
		create?: {
			path: string;
			method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
			policy?: string;
		};
		update?: {
			path: string;
			method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
			policy?: string;
		};
		remove?: {
			path: string;
			method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
			policy?: string;
		};
	};
	identity?:
	| { type: 'number'; param?: 'id' }
	| { type: 'string'; param?: 'id' | 'slug' | 'uuid' };
	storage?: Record<string, unknown>;
	ui?: unknown;
}

interface TestConfig {
	version?: 1 | 2;
	namespace: string;
	schemas: Record<
		string,
		{
			path: string;
			generated: { types: string };
			description?: string;
		}
	>;
	resources: Record<string, TestResourceConfig>;
	adapters?: { php?: unknown };
}

interface ReporterSpy {
	child: jest.Mock<ReporterSpy>;
	error: jest.Mock;
	warn: jest.Mock;
	info: jest.Mock;
	debug: jest.Mock;
}

function createMockReporter() {
	const childReporter = createReporterSpy();
	const reporter = createReporterSpy(childReporter);
	return { reporter: reporter as unknown as Reporter, child: childReporter };
}

function createReporterSpy(child?: ReporterSpy): ReporterSpy {
	const reporter: ReporterSpy = {
		child: jest.fn(() => child ?? reporter),
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	};
	reporter.child.mockImplementation(() => child ?? reporter);
	return reporter;
}

describe('validateKernelConfig', () => {
	const baseSchema = {
		default: {
			path: 'schemas/default.json',
			generated: {
				types: 'types/default.d.ts',
			},
		},
	} as const;

	function createValidConfig(): TestConfig {
		return {
			version: 1,
			namespace: 'valid-namespace',
			schemas: baseSchema,
			resources: {
				thing: {
					name: 'thing',
					routes: {
						get: {
							path: '/valid/v1/things/:id',
							method: 'GET',
						},
					},
				},
			},
		};
	}

	it('returns sanitized namespace when required', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.namespace = 'Valid Namespace';

		const result = validateKernelConfig(config, {
			reporter,
			origin: 'kernel.config.js',
			sourcePath: '/tmp/kernel.config.js',
		});

		expect(result.namespace).toBe('valid-namespace');
		expect(result.config.namespace).toBe('valid-namespace');
		expect(child.warn).toHaveBeenCalledWith(
			'Namespace "Valid Namespace" sanitised to "valid-namespace" for CLI usage.',
			expect.objectContaining({
				original: 'Valid Namespace',
				sanitized: 'valid-namespace',
			})
		);
	});

	it('accepts DataViews UI metadata on resources', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources.thing!.ui = {
			admin: {
				view: 'dataviews',
				dataviews: {
					fields: [{ id: 'title', label: 'Title' }],
					defaultView: {
						type: 'table',
						fields: ['title'],
					},
					screen: {
						component: 'ThingAdminScreen',
						route: '/admin/things',
						menu: {
							slug: 'thing-admin',
							title: 'Things',
							capability: 'manage_options',
						},
					},
				},
			},
		};

		const result = validateKernelConfig(config, {
			reporter,
			origin: 'kernel.config.ts',
			sourcePath: '/tmp/kernel.config.ts',
		});

		const resource = result.config.resources.thing!;
		expect(resource.ui?.admin?.view).toBe('dataviews');
		expect(resource.ui?.admin?.dataviews?.fields).toEqual([
			{ id: 'title', label: 'Title' },
		]);
		expect(resource.ui?.admin?.dataviews?.screen?.menu?.slug).toBe(
			'thing-admin'
		);
	});

	it('throws when namespace cannot be sanitized', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.namespace = '123-invalid';

		expect(() =>
			validateKernelConfig(config, {
				reporter,
				origin: 'kernel.config.js',
				sourcePath: '/tmp/kernel.config.js',
			})
		).toThrow(KernelError);
		expect(child.error).toHaveBeenCalled();
	});

	it('defaults version to 1 with warning when omitted', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		delete config.version;

		const result = validateKernelConfig(config, {
			reporter,
			origin: 'kernel.config.js',
			sourcePath: '/tmp/kernel.config.js',
		});

		expect(result.config.version).toBe(1);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('missing "version"'),
			expect.objectContaining({ sourcePath: '/tmp/kernel.config.js' })
		);
	});

	it('throws when version is unsupported', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.version = 2;

		expect(() =>
			validateKernelConfig(config, {
				reporter,
				origin: 'kernel.config.js',
				sourcePath: '/tmp/kernel.config.js',
			})
		).toThrow(KernelError);
		expect(child.error).toHaveBeenCalled();
	});

	it('throws when config shape fails validation', () => {
		const { reporter, child } = createMockReporter();

		expect(() =>
			validateKernelConfig(null, {
				reporter,
				origin: 'kernel.config.js',
				sourcePath: '/tmp/kernel.config.js',
			})
		).toThrow(KernelError);
		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('Invalid kernel config discovered'),
			expect.objectContaining({
				errors: expect.any(Array),
			})
		);
	});

	it('throws when identity param does not exist in routes', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.resources.thing!.identity = { type: 'string', param: 'slug' };

		expect(() =>
			validateKernelConfig(config, {
				reporter,
				origin: 'kernel.config.js',
				sourcePath: '/tmp/kernel.config.js',
			})
		).toThrow(KernelError);
		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('Identity param'),
			expect.objectContaining({
				resourceName: 'thing',
				identity: { type: 'string', param: 'slug' },
			})
		);
	});

	it('warns when wp-post storage omits postType', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.resources.thing!.routes.list = {
			path: '/valid/v1/things',
			method: 'GET',
		};
		config.resources.thing!.storage = {
			mode: 'wp-post',
		};

		const result = validateKernelConfig(config, {
			reporter,
			origin: 'kernel.config.js',
			sourcePath: '/tmp/kernel.config.js',
		});

		expect(result.config.resources.thing!.storage).toEqual(
			expect.objectContaining({ mode: 'wp-post' })
		);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'wp-post storage without specifying "postType"'
			),
			expect.objectContaining({ resourceName: 'thing' })
		);
	});
	it('throws when adapters.php is not a function', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.adapters = {
			php: 'not-a-function',
		};

		expect(() =>
			validateKernelConfig(config, {
				reporter,
				origin: 'kernel.config.js',
				sourcePath: '/tmp/kernel.config.js',
			})
		).toThrow(KernelError);
		expect(child.error).toHaveBeenCalled();
	});
});

describe('validateKernelConfig helpers', () => {
	it('requires at least one resource route when validating', () => {
		const state = { errors: [] as string[] };

		const result = resourceRoutesValidator(
			{ list: undefined, get: undefined } as never,
			state as never
		);

		expect(result).toBe(false);
		expect(state.errors).toContain(
			'resources[].routes must define at least one operation.'
		);
	});

	it('normalizes missing versions and reports errors for unsupported ones', () => {
		const { reporter } = createMockReporter();
		const normalized = normalizeVersion(
			undefined,
			reporter,
			'/tmp/config.ts'
		);
		expect(normalized).toBe(1);
		expect(
			(reporter as unknown as { warn: jest.Mock }).warn
		).toHaveBeenCalled();

		expect(() =>
			normalizeVersion(2 as never, reporter, '/tmp/config.ts')
		).toThrow(KernelError);
	});

	it('warns when identity metadata exists without routes', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				identity: { type: 'number', param: 'id' },
				routes: {} as never,
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('defines identity metadata but no routes'),
			expect.objectContaining({ resourceName: 'thing' })
		);
	});

	it('formats validation errors into human readable strings', () => {
		const message = formatValidationErrors(
			['first', 'second'],
			'/tmp/config.ts',
			'kernel.config.ts'
		);

		expect(message).toMatch('Invalid kernel config discovered');
		expect(message).toContain('first');
		expect(message).toContain('second');
	});

	it('throws when resource has duplicate routes', () => {
		const { child } = createMockReporter();

		expect(() =>
			runResourceChecks(
				'thing',
				{
					name: 'thing',
					routes: {
						list: {
							path: '/things',
							method: 'GET',
						},
						get: {
							path: '/things',
							method: 'GET',
						},
					},
				} as ResourceConfig,
				child as unknown as Reporter
			)
		).toThrow(KernelError);

		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('duplicate route'),
			expect.objectContaining({
				resourceName: 'thing',
				method: 'GET',
				path: '/things',
			})
		);
	});

	it('warns when write routes lack policy', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				routes: {
					create: {
						path: '/things',
						method: 'POST',
					},
					update: {
						path: '/things/:id',
						method: 'PUT',
					},
				},
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).toHaveBeenCalledTimes(2);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('write method but has no policy'),
			expect.objectContaining({
				resourceName: 'thing',
				routeKey: 'create',
				method: 'POST',
			})
		);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('write method but has no policy'),
			expect.objectContaining({
				resourceName: 'thing',
				routeKey: 'update',
				method: 'PUT',
			})
		);
	});

	it('does not warn when write routes have policy', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				routes: {
					create: {
						path: '/things',
						method: 'POST',
						policy: 'create_things',
					},
				},
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).not.toHaveBeenCalled();
	});
});
