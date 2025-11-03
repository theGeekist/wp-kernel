import type {
	ResourceDataViewMenuConfig,
	ResourceDataViewScreenConfig,
} from '../../../dataviews/types';
import type { DataViewMetadataIssue, MetadataPath } from './types';
import { applyOptional, isRecord, normalizeNonEmptyString } from './primitives';
import { reportIssue } from './issues';
import { normalizeMenu } from './menu';

export function normalizeScreen(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath
): ResourceDataViewScreenConfig | undefined {
	if (!isRecord(value)) {
		return reportIssue(
			issues,
			path,
			'Screen configuration must be an object.',
			value
		);
	}

	const screen: ResourceDataViewScreenConfig = {};
	const stringKeys = [
		'component',
		'route',
		'resourceImport',
		'resourceSymbol',
		'kernelImport',
		'kernelSymbol',
	] as const;

	for (const key of stringKeys) {
		const success = applyOptional(
			value as Record<string, unknown>,
			key,
			path,
			(candidate, fieldPath) =>
				normalizeNonEmptyString(
					candidate,
					issues,
					fieldPath,
					`${key} must be a non-empty string when provided.`
				),
			(stringValue) => {
				screen[key] = stringValue as string;
			}
		);

		if (!success) {
			return undefined;
		}
	}

	if (
		!applyOptional(
			value as Record<string, unknown>,
			'menu',
			path,
			(candidate, fieldPath) =>
				normalizeMenu(candidate, issues, fieldPath),
			(menu) => {
				screen.menu = menu as ResourceDataViewMenuConfig;
			}
		)
	) {
		return undefined;
	}

	for (const [key, extra] of Object.entries(value)) {
		if (
			key === 'menu' ||
			stringKeys.includes(key as (typeof stringKeys)[number])
		) {
			continue;
		}

		(screen as Record<string, unknown>)[key] = extra;
	}

	return screen;
}
