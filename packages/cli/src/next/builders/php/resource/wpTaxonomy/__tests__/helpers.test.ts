import { createWpTaxonomyHelperMethods } from '../helpers';
import type { IRResource } from '../../../../../../ir/types';
import type { ResolvedIdentity } from '../../../identity';

type TaxonomyStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-taxonomy' }
>;

describe('createWpTaxonomyHelperMethods', () => {
	const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
	const storage: TaxonomyStorage = {
		mode: 'wp-taxonomy',
		taxonomy: 'job_category',
		hierarchical: true,
	};

	const resource: IRResource = {
		name: 'jobCategories',
		schemaKey: 'jobCategory',
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: ['jobCategories', 'list'], source: 'default' },
			get: { segments: ['jobCategories', 'get'], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: 'taxonomy-resource',
		warnings: [],
	};

	function createHelpers(overrides: Partial<TaxonomyStorage> = {}) {
		return createWpTaxonomyHelperMethods({
			resource: {
				...resource,
				storage: { ...storage, ...overrides },
			},
			pascalName: 'JobCategories',
			identity,
			errorCodeFactory: (suffix) => `taxonomy_${suffix}`,
		});
	}

	it('annotates resolve helper with the identity parameter and nullable WP_Term return type', () => {
		const helpers = createHelpers();

		const resolveHelper = helpers[2];
		expect(resolveHelper.node?.name.name).toBe('resolveJobCategoriesTerm');
		expect(resolveHelper.node?.params).toHaveLength(1);
		expect(resolveHelper.node?.params[0].var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'identity',
		});
		expect(resolveHelper.node?.returnType).toMatchObject({
			nodeType: 'NullableType',
			type: { nodeType: 'Name', parts: ['WP_Term'] },
		});
	});

	it('exposes a typed WP_Term parameter when preparing the taxonomy response', () => {
		const helpers = createHelpers();

		const prepareHelper = helpers[1];
		expect(prepareHelper.node?.name.name).toBe(
			'prepareJobCategoriesTermResponse'
		);
		expect(prepareHelper.node?.params).toHaveLength(1);
		expect(prepareHelper.node?.params[0].type).toMatchObject({
			nodeType: 'Name',
			parts: ['WP_Term'],
		});
		expect(prepareHelper).toEqual(
			expect.arrayContaining([
				expect.stringContaining("'hierarchical' => true"),
			])
		);
	});

	it('exposes the identity candidate parameter when validating taxonomy identities', () => {
		const helpers = createHelpers();

		const validateHelper = helpers[3];
		expect(validateHelper.node?.name.name).toBe(
			'validateJobCategoriesIdentity'
		);
		expect(validateHelper.node?.params).toHaveLength(1);
		expect(validateHelper.node?.params[0].var).toMatchObject({
			nodeType: 'Expr_Variable',
			name: 'value',
		});
		expect(validateHelper).toEqual(
			expect.arrayContaining([
				expect.stringContaining('return trim( (string) $value );'),
			])
		);
	});

	it('toggles hierarchical output for non-hierarchical taxonomies', () => {
		const helpers = createHelpers({ hierarchical: false });

		const prepareHelper = helpers[1];
		expect(prepareHelper).toEqual(
			expect.arrayContaining([
				expect.stringContaining("'hierarchical' => false"),
			])
		);
	});
});
