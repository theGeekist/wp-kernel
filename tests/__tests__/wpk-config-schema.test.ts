import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const currentDir = __dirname;
const schemaPath = path.resolve(
	currentDir,
	'../../docs/reference/wpk-config.schema.json'
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

function createValidator() {
	const ajv = new Ajv2020({ allErrors: true, strict: true });
	addFormats(ajv);
	ajv.addKeyword({
		keyword: 'typeof',
		schemaType: 'string',
		validate(expected: string, data: unknown) {
			return typeof data === expected;
		},
	});
	return ajv.compile(schema);
}

async function loadConfig(relativePath: string) {
	const fileUrl = pathToFileURL(path.resolve(currentDir, relativePath));
	const module = await import(fileUrl.href);
	return module.wpkConfig;
}

describe('wpk-config json schema', () => {
	it('accepts the CLI sample config', async () => {
		const validate = createValidator();
		const config = await loadConfig(
			'../../examples/test-the-cli/wpk.config.ts'
		);
		const result = validate(config);
		if (!result) {
			console.error(validate.errors);
		}
		expect(result).toBe(true);
	});

	it('accepts the showcase config with advanced UI metadata', async () => {
		const validate = createValidator();
		const config = await loadConfig(
			'../../examples/showcase/wpk.config.ts'
		);
		const result = validate(config);
		if (!result) {
			console.error(validate.errors);
		}
		expect(result).toBe(true);
	});

	it('rejects configs missing required top-level fields', () => {
		const validate = createValidator();
		const invalidConfig = { version: 1, schemas: {}, resources: {} };
		expect(validate(invalidConfig)).toBe(false);
		expect(validate.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ keyword: 'required' }),
			])
		);
	});
});
