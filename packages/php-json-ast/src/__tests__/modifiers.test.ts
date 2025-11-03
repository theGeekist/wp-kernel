import {
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_CLASS_MODIFIER_FINAL,
	formatClassModifiers,
} from '../modifiers';

describe('formatClassModifiers', () => {
	it('returns matching keywords for enabled flags', () => {
		const keywords = formatClassModifiers(
			PHP_CLASS_MODIFIER_ABSTRACT + PHP_CLASS_MODIFIER_FINAL
		);

		expect(keywords).toContain('abstract');
		expect(keywords).toContain('final');
	});

	it('returns an empty array when no modifiers match', () => {
		expect(formatClassModifiers(0)).toEqual([]);
		expect(formatClassModifiers(PHP_CLASS_MODIFIER_ABSTRACT / 2)).toEqual(
			[]
		);
	});
});
