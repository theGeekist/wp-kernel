import {
	DEFAULT_CODEMOD_STACK_KEY,
	type PhpCodemodConfiguration,
	type PhpCodemodVisitorConfiguration,
} from '../driver/codemods';

export interface BaselineCodemodPackOptions {
	readonly canonicaliseNames?: boolean;
	readonly preserveOriginalNames?: boolean;
	readonly replaceResolvedNames?: boolean;
	readonly groupUseStatements?: boolean;
	readonly caseSensitiveSort?: boolean;
}

export function createBaselineCodemodConfiguration(
	options: BaselineCodemodPackOptions = {}
): PhpCodemodConfiguration {
	const visitors = [
		...buildNameCanonicaliserVisitors(options),
		...buildUseGroupingVisitors(options),
	];

	if (visitors.length === 0) {
		return { stacks: [] };
	}

	return {
		stacks: [
			{
				key: DEFAULT_CODEMOD_STACK_KEY,
				visitors,
			},
		],
	};
}

function buildNameCanonicaliserVisitors(
	options: BaselineCodemodPackOptions
): PhpCodemodVisitorConfiguration[] {
	if (options.canonicaliseNames === false) {
		return [];
	}

	const visitorOptions: Record<string, unknown> = {};

	if (options.preserveOriginalNames === false) {
		visitorOptions.preserveOriginalNames = options.preserveOriginalNames;
	}

	if (options.replaceResolvedNames === true) {
		visitorOptions.replaceNodes = options.replaceResolvedNames;
	}

	return [
		{
			key: 'baseline.name-canonicaliser',
			...(Object.keys(visitorOptions).length > 0
				? { options: visitorOptions }
				: {}),
		},
	];
}

function buildUseGroupingVisitors(
	options: BaselineCodemodPackOptions
): PhpCodemodVisitorConfiguration[] {
	if (options.groupUseStatements === false) {
		return [];
	}

	const visitorOptions: Record<string, unknown> = {};

	if (options.caseSensitiveSort === true) {
		visitorOptions.caseSensitive = true;
	}

	return [
		{
			key: 'baseline.use-grouping',
			...(Object.keys(visitorOptions).length > 0
				? { options: visitorOptions }
				: {}),
		},
	];
}
