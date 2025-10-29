import {
	createBaselineCodemodConfiguration,
	type BaselineCodemodPackOptions,
} from '../../codemods/baselinePack';
import { DEFAULT_CODEMOD_STACK_KEY } from '../../driver/codemods';

describe('createBaselineCodemodConfiguration', () => {
	function createConfiguration(
		options?: BaselineCodemodPackOptions
	): ReturnType<typeof createBaselineCodemodConfiguration> {
		return createBaselineCodemodConfiguration(options);
	}

	it('enables canonical name and use grouping visitors by default', () => {
		const configuration = createConfiguration();

		expect(configuration).toEqual({
			stacks: [
				{
					key: DEFAULT_CODEMOD_STACK_KEY,
					visitors: [
						{ key: 'baseline.name-canonicaliser' },
						{ key: 'baseline.use-grouping' },
					],
				},
			],
		});
	});

	it('omits visitors when the corresponding options are disabled', () => {
		const configuration = createConfiguration({
			canonicaliseNames: false,
			groupUseStatements: false,
		});

		expect(configuration).toEqual({ stacks: [] });
	});

	it('threads override options when provided', () => {
		const configuration = createConfiguration({
			canonicaliseNames: true,
			preserveOriginalNames: false,
			replaceResolvedNames: true,
			caseSensitiveSort: true,
		});

		expect(configuration).toEqual({
			stacks: [
				{
					key: DEFAULT_CODEMOD_STACK_KEY,
					visitors: [
						{
							key: 'baseline.name-canonicaliser',
							options: {
								preserveOriginalNames: false,
								replaceNodes: true,
							},
						},
						{
							key: 'baseline.use-grouping',
							options: {
								caseSensitive: true,
							},
						},
					],
				},
			],
		});
	});
});
