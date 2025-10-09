import { KernelError } from '@geekist/wp-kernel';
import type { Reporter } from '@geekist/wp-kernel';
import { validateKernelConfig } from '../validate-kernel-config';

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

function createMockReporter() {
	const childReporter = createReporterSpy();
	const reporter = createReporterSpy(childReporter);
	return { reporter: reporter as unknown as Reporter, child: childReporter };
}

function createReporterSpy(child?: ReturnType<typeof createReporterSpy>) {
	const reporter = {
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
		config.resources.thing.identity = { type: 'string', param: 'slug' };

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
		config.resources.thing.routes.list = {
			path: '/valid/v1/things',
			method: 'GET',
		};
		config.resources.thing.storage = {
			mode: 'wp-post',
		};

		const result = validateKernelConfig(config, {
			reporter,
			origin: 'kernel.config.js',
			sourcePath: '/tmp/kernel.config.js',
		});

		expect(result.config.resources.thing.storage).toEqual(
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
