import { WPKernelError } from '@wpkernel/core';
import type {
	PhpExprAssign,
	PhpExprArrayDimFetch,
	PhpExprVariable,
	PhpScalarString,
	PhpStmt,
	PhpStmtExpression,
} from '@wpkernel/php-json-ast';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';

import {
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
	type MutationHelperOptions,
	type MutationIdentity,
} from '../helpers';

const IDENTITY: MutationIdentity = { type: 'string', param: 'slug' };

type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;

function buildResource(
	overrides: Partial<Omit<WpPostStorage, 'mode'>> = {}
): MutationHelperOptions['resource'] {
	const storage: WpPostStorage = {
		mode: 'wp-post',
		statuses: ['draft', 'publish'],
		supports: ['title', 'editor', 'excerpt'],
		meta: {
			rating: { type: 'integer', single: true },
			popularity: { type: 'number', single: true },
			featured: { type: 'boolean', single: true },
			tags: { type: 'array', single: false },
			author: { type: 'string', single: false },
			metadata: { type: 'object', single: true },
		},
		taxonomies: {
			genres: { taxonomy: 'book_genre' },
		},
		...overrides,
	};

	return {
		name: 'books',
		storage,
	};
}

describe('wp-post mutation helpers', () => {
	it('throws a WPKernelError when the resource does not use wp-post storage', () => {
		const resource: MutationHelperOptions['resource'] = {
			name: 'books',
			storage: { mode: 'wp-taxonomy', taxonomy: 'genre' },
		};

		expect(() =>
			syncWpPostMeta({
				resource,
				pascalName: 'Book',
				identity: IDENTITY,
			})
		).toThrow(WPKernelError);
	});

	it('returns early when no meta fields are configured', () => {
		const resource = buildResource({ meta: {} });

		const method = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('meta-empty-output');
	});

	it('sanitises meta payloads for all supported descriptor types', () => {
		const resource = buildResource();

		const method = syncWpPostMeta({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('meta-sanitizers-output');
	});

	it('wraps taxonomy assignments with result checks', () => {
		const resource = buildResource();

		const method = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('taxonomy-sync-output');
	});

	it('returns early when no taxonomies are configured', () => {
		const resource = buildResource({ taxonomies: {} });

		const method = syncWpPostTaxonomies({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('taxonomy-empty-output');
	});

	it('prepares mutation responses with supports, meta, and taxonomies', () => {
		const resource = buildResource();

		const method = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: IDENTITY,
		});

		expect(method).toMatchSnapshot('prepare-response-output');
	});

	it('omits slug and support-specific fields when not configured', () => {
		const resource: MutationHelperOptions['resource'] = {
			name: 'books',
			storage: {
				mode: 'wp-post',
				supports: [],
				meta: {},
				taxonomies: {},
			},
		};

		const method = prepareWpPostResponse({
			resource,
			pascalName: 'Book',
			identity: { type: 'number', param: 'id' },
		});

		const assignedKeys = new Set(
			(method.stmts ?? []).flatMap((statement) => {
				if (!isExpressionStatement(statement)) {
					return [];
				}

				const expression = statement.expr;
				if (!isAssignExpression(expression)) {
					return [];
				}

				const target = expression.var;
				if (
					!isArrayDimFetch(target) ||
					!isVariableExpression(target.var) ||
					target.var.name !== 'data'
				) {
					return [];
				}

				const dimension = target.dim;
				if (!isScalarStringLiteral(dimension)) {
					return [];
				}

				return [dimension.value];
			})
		);

		expect(assignedKeys.has('slug')).toBe(false);
		expect(assignedKeys.has('title')).toBe(false);
		expect(assignedKeys.has('content')).toBe(false);
		expect(assignedKeys.has('excerpt')).toBe(false);
	});
});

function isExpressionStatement(
	statement: PhpStmt
): statement is PhpStmtExpression {
	return statement.nodeType === 'Stmt_Expression';
}

function isAssignExpression(
	expression: PhpStmtExpression['expr']
): expression is PhpExprAssign {
	return expression.nodeType === 'Expr_Assign';
}

function isArrayDimFetch(
	expression: PhpExprAssign['var']
): expression is PhpExprArrayDimFetch {
	return expression.nodeType === 'Expr_ArrayDimFetch';
}

function isVariableExpression(
	expression: PhpExprArrayDimFetch['var']
): expression is PhpExprVariable {
	return expression.nodeType === 'Expr_Variable';
}

function isScalarStringLiteral(
	expression: PhpExprArrayDimFetch['dim']
): expression is PhpScalarString {
	return Boolean(expression && expression.nodeType === 'Scalar_String');
}
