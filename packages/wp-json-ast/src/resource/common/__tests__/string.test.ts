import { toSnakeCase } from '../string';

describe('resource/common/string', () => {
	it('converts camel case to snake case', () => {
		expect(toSnakeCase('SomeValue')).toBe('some_value');
	});

	it('collapses whitespace and punctuation into single underscores', () => {
		expect(toSnakeCase('value-with  punctuation')).toBe(
			'value_with_punctuation'
		);
	});

	it('trims leading and trailing underscores from input', () => {
		expect(toSnakeCase('__Leading_andTrailing__')).toBe(
			'leading_and_trailing'
		);
	});
});
