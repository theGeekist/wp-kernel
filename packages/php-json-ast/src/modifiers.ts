/**
 * PHP class modifier flag for `abstract`.
 *
 * @category PHP AST
 */
export const PHP_CLASS_MODIFIER_ABSTRACT = 16;
/**
 * PHP class modifier flag for `final`.
 *
 * @category PHP AST
 */
export const PHP_CLASS_MODIFIER_FINAL = 32;

const CLASS_MODIFIER_KEYWORDS: Array<{
	readonly flag: number;
	readonly keyword: string;
}> = [
	{ flag: PHP_CLASS_MODIFIER_ABSTRACT, keyword: 'abstract' },
	{ flag: PHP_CLASS_MODIFIER_FINAL, keyword: 'final' },
];

/**
 * PHP method modifier flag for `public`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_PUBLIC = 1;
/**
 * PHP method modifier flag for `protected`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_PROTECTED = 2;
/**
 * PHP method modifier flag for `private`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_PRIVATE = 4;
/**
 * PHP method modifier flag for `static`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_STATIC = 8;
/**
 * PHP method modifier flag for `abstract`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_ABSTRACT = 16;
/**
 * PHP method modifier flag for `final`.
 *
 * @category PHP AST
 */
export const PHP_METHOD_MODIFIER_FINAL = 32;

/**
 * Formats PHP class modifiers into an array of keywords.
 *
 * @category PHP AST
 * @param    flags - The bitmask of class modifier flags.
 * @returns An array of string keywords (e.g., ['abstract', 'final']).
 */
export function formatClassModifiers(flags: number): string[] {
	const keywords: string[] = [];

	for (const modifier of CLASS_MODIFIER_KEYWORDS) {
		if (isFlagSet(flags, modifier.flag)) {
			keywords.push(modifier.keyword);
		}
	}

	return keywords;
}

function isFlagSet(flags: number, flag: number): boolean {
	if (flag === 0) {
		return false;
	}

	return Math.floor(flags / flag) % 2 === 1;
}
