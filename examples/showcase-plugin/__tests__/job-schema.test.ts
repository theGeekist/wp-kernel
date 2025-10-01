/**
 * Tests for Job schema validation
 * Validates that the JSON Schema is correct and type generation works
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import jobSchema from '../contracts/job.schema.json';

describe('Job Schema Validation', () => {
	let ajv: Ajv;
	let schema: any;

	beforeAll(() => {
		// Setup Ajv with formats support (date-time, etc.)
		ajv = new Ajv({ allErrors: true, strict: true });
		addFormats(ajv);

		// Use imported schema
		schema = jobSchema;
	});

	describe('Schema Structure', () => {
		it('should have valid JSON Schema meta properties', () => {
			expect(schema.$schema).toBe(
				'http://json-schema.org/draft-07/schema#'
			);
			expect(schema.$id).toBe('https://geekist.co/schemas/job.json');
			expect(schema.title).toBe('Job');
			expect(schema.type).toBe('object');
		});

		it('should have required fields defined', () => {
			expect(schema.required).toEqual([
				'id',
				'title',
				'status',
				'created_at',
			]);
		});

		it('should have all expected properties', () => {
			const properties = Object.keys(schema.properties);
			expect(properties).toContain('id');
			expect(properties).toContain('title');
			expect(properties).toContain('slug');
			expect(properties).toContain('status');
			expect(properties).toContain('description');
			expect(properties).toContain('department');
			expect(properties).toContain('location');
			expect(properties).toContain('seniority');
			expect(properties).toContain('job_type');
			expect(properties).toContain('remote_policy');
			expect(properties).toContain('salary_min');
			expect(properties).toContain('salary_max');
			expect(properties).toContain('apply_deadline');
			expect(properties).toContain('created_at');
			expect(properties).toContain('updated_at');
		});

		it('should have correct enum values for status', () => {
			expect(schema.properties.status.enum).toEqual([
				'draft',
				'publish',
				'closed',
			]);
		});

		it('should have correct enum values for seniority', () => {
			expect(schema.properties.seniority.enum).toEqual([
				'Junior',
				'Mid',
				'Senior',
				'Lead',
				'Principal',
			]);
		});

		it('should have correct enum values for job_type', () => {
			expect(schema.properties.job_type.enum).toEqual([
				'Full-time',
				'Part-time',
				'Contract',
				'Internship',
				'Temporary',
			]);
		});

		it('should have correct enum values for remote_policy', () => {
			expect(schema.properties.remote_policy.enum).toEqual([
				'on-site',
				'remote',
				'hybrid',
			]);
		});

		it('should not allow additional properties', () => {
			expect(schema.additionalProperties).toBe(false);
		});
	});

	describe('Schema Validation', () => {
		let validate: any;

		beforeAll(() => {
			validate = ajv.compile(schema);
		});

		it('should validate a minimal valid job', () => {
			const validJob = {
				id: 1,
				title: 'Senior Developer',
				status: 'publish',
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(validJob);
			expect(valid).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should validate a complete valid job', () => {
			const validJob = {
				id: 123,
				title: 'Senior WordPress Developer',
				slug: 'senior-wordpress-developer',
				status: 'publish',
				description: '<p>Great opportunity</p>',
				department: 'Engineering',
				location: 'San Francisco, CA',
				seniority: 'Senior',
				job_type: 'Full-time',
				remote_policy: 'hybrid',
				salary_min: 12000000,
				salary_max: 18000000,
				apply_deadline: '2025-12-31T23:59:59Z',
				created_at: '2025-10-01T12:00:00Z',
				updated_at: '2025-10-01T14:30:00Z',
			};

			const valid = validate(validJob);
			expect(valid).toBe(true);
			expect(validate.errors).toBeNull();
		});

		it('should reject job without required fields', () => {
			const invalidJob = {
				title: 'Developer',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
			expect(validate.errors).toBeTruthy();
			expect(validate.errors?.length).toBeGreaterThan(0);
		});

		it('should reject job with invalid status', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				status: 'invalid-status',
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
			expect(validate.errors?.[0]?.instancePath).toBe('/status');
		});

		it('should reject job with invalid seniority', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				status: 'publish',
				seniority: 'Supreme',
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});

		it('should reject job with negative salary', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				status: 'publish',
				salary_min: -1000,
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});

		it('should reject job with invalid date format', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				status: 'publish',
				created_at: 'not-a-date',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});

		it('should reject job with additional properties', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				status: 'publish',
				created_at: '2025-10-01T12:00:00Z',
				unexpected_field: 'should not be here',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});

		it('should reject job with empty title', () => {
			const invalidJob = {
				id: 1,
				title: '',
				status: 'publish',
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});

		it('should reject job with invalid slug pattern', () => {
			const invalidJob = {
				id: 1,
				title: 'Developer',
				slug: 'Invalid Slug With Spaces',
				status: 'publish',
				created_at: '2025-10-01T12:00:00Z',
			};

			const valid = validate(invalidJob);
			expect(valid).toBe(false);
		});
	});

	describe('Type Generation', () => {
		it('should have generated TypeScript types file', () => {
			const typesPath = resolve(__dirname, '../types/job.d.ts');
			const typesContent = readFileSync(typesPath, 'utf-8');

			expect(typesContent).toContain('export interface Job');
			expect(typesContent).toContain('DO NOT EDIT MANUALLY');
		});

		it('should have correct type for status field', () => {
			const typesPath = resolve(__dirname, '../types/job.d.ts');
			const typesContent = readFileSync(typesPath, 'utf-8');

			expect(typesContent).toContain('"draft" | "publish" | "closed"');
		});

		it('should have correct type for seniority field', () => {
			const typesPath = resolve(__dirname, '../types/job.d.ts');
			const typesContent = readFileSync(typesPath, 'utf-8');

			expect(typesContent).toContain(
				'"Junior" | "Mid" | "Senior" | "Lead" | "Principal"'
			);
		});
	});
});
