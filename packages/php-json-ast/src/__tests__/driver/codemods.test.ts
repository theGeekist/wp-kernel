import {
	DEFAULT_CODEMOD_STACK_KEY,
	isPhpCodemodConfigurationEmpty,
	serialisePhpCodemodConfiguration,
	type PhpCodemodConfiguration,
} from '../../driver/codemods';

describe('codemod configuration helpers', () => {
	it('detects when configuration stacks are empty', () => {
		const empty: PhpCodemodConfiguration = { stacks: [] };
		expect(isPhpCodemodConfigurationEmpty(empty)).toBe(true);

		const withEmptyStack: PhpCodemodConfiguration = {
			stacks: [
				{
					key: DEFAULT_CODEMOD_STACK_KEY,
					visitors: [],
				},
			],
		};

		expect(isPhpCodemodConfigurationEmpty(withEmptyStack)).toBe(true);

		const populated: PhpCodemodConfiguration = {
			stacks: [
				{
					key: DEFAULT_CODEMOD_STACK_KEY,
					visitors: [
						{
							key: 'name-resolver',
							options: { preserveOriginalNames: true },
						},
					],
				},
			],
		};

		expect(isPhpCodemodConfigurationEmpty(populated)).toBe(false);
	});

	it('serialises configurations to formatted JSON', () => {
		const configuration: PhpCodemodConfiguration = {
			stacks: [
				{
					key: DEFAULT_CODEMOD_STACK_KEY,
					visitors: [
						{
							key: 'name-resolver',
						},
					],
				},
			],
		};

		const serialised = serialisePhpCodemodConfiguration(configuration);
		expect(serialised).toBe(`${JSON.stringify(configuration, null, 2)}\n`);
	});
});
