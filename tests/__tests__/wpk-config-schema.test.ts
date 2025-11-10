import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const schemaPath = path.resolve(
	__dirname,
	'../../docs/reference/wpk-config.schema.json'
);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function makeValidator() {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	addFormats(ajv);

	// Allow the custom `typeof` keyword used in the schema
	ajv.addKeyword({
		keyword: 'typeof',
		schemaType: 'string',
		validate(expected: string, data: unknown) {
			return typeof data === expected;
		},
	});

	return ajv.compile(schema);
}

describe('wpk-config.schema.json', () => {
	it('accepts a minimal valid config', () => {
		const validate = makeValidator();
		const config = {
			version: 1,
			namespace: 'acme-demo',
			schemas: {},
			resources: {
				job: {
					name: 'job',
					routes: {
						list: { path: '/acme-demo/v1/jobs', method: 'GET' },
						get: { path: '/acme-demo/v1/jobs/:id', method: 'GET' },
					},
					identity: { type: 'number', param: 'id' },
				},
			},
			adapters: {},
		};

		const result = validate(config);
		if (!result) {
			console.error(validate.errors);
		}
		expect(result).toBe(true);
	});

	it('accepts a richer resource config with dataviews metadata', () => {
		const validate = makeValidator();
		const config = {
			version: 1,
			namespace: 'showcase',
			schemas: {},
			resources: {
				thing: {
					name: 'thing',
					routes: {
						list: { path: '/showcase/v1/things', method: 'GET' },
						get: { path: '/showcase/v1/things/:id', method: 'GET' },
						create: { path: '/showcase/v1/things', method: 'POST' },
					},
					identity: { type: 'string', param: 'slug' },
					ui: {
						admin: {
							dataviews: {
								fields: [{ key: 'title' }],
								views: [
									{ id: 'all', label: 'All', view: {} },
									{
										id: 'drafts',
										label: 'Drafts',
										view: {},
										isDefault: false,
									},
								],
								screen: {
									component: 'ThingList',
									route: '/admin/things',
									menu: { slug: 'things', title: 'Things' },
								},
							},
						},
					},
				},
			},
			adapters: {},
		};

		const result = validate(config);
		if (!result) {
			console.error(validate.errors);
		}
		expect(result).toBe(true);
	});

	it('rejects a config missing required fields', () => {
		const validate = makeValidator();
		const invalid = { version: 1, schemas: {}, resources: {} }; // missing namespace
		const result = validate(invalid);
		expect(result).toBe(false);
		expect(validate.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ keyword: 'required' }),
			])
		);
	});
});
