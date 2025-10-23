export const PHP_CLASS_MODIFIER_ABSTRACT = 16;
export const PHP_CLASS_MODIFIER_FINAL = 32;

const CLASS_MODIFIER_KEYWORDS: Array<{
	readonly flag: number;
	readonly keyword: string;
}> = [
	{ flag: PHP_CLASS_MODIFIER_ABSTRACT, keyword: 'abstract' },
	{ flag: PHP_CLASS_MODIFIER_FINAL, keyword: 'final' },
];

export const PHP_METHOD_MODIFIER_PUBLIC = 1;
export const PHP_METHOD_MODIFIER_PROTECTED = 2;
export const PHP_METHOD_MODIFIER_PRIVATE = 4;
export const PHP_METHOD_MODIFIER_STATIC = 8;
export const PHP_METHOD_MODIFIER_ABSTRACT = 16;
export const PHP_METHOD_MODIFIER_FINAL = 32;

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
