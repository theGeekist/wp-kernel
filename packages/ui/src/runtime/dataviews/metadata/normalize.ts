import type { ResourceObject } from '@wpkernel/core/resource';

import type {
	DataViewMetadataIssue,
	MetadataNormalizationResult,
} from './types';
import { buildConfig } from './config';
import { isNonEmptyString, isRecord } from './primitives';
import { reportIssue } from './issues';

export function normalizeResourceDataViewMetadata<TItem, TQuery>(
	resource: ResourceObject<TItem, TQuery>
): MetadataNormalizationResult<TItem, TQuery> {
	const issues: DataViewMetadataIssue[] = [];
	const metadataPath = ['ui', 'admin', 'dataviews'] as const;

	const candidate = (
		resource as ResourceObject<TItem, TQuery> & {
			ui?: {
				admin?: {
					dataviews?: unknown;
				};
			};
		}
	).ui?.admin?.dataviews;

	if (candidate === undefined) {
		return { issues };
	}

	if (!isRecord(candidate)) {
		reportIssue(
			issues,
			metadataPath,
			'resource.ui.admin.dataviews must be an object.',
			candidate
		);
		return { issues };
	}

	const { preferencesKey, ...rawConfig } = candidate as Record<
		string,
		unknown
	> & {
		preferencesKey?: unknown;
	};

	if (preferencesKey !== undefined && !isNonEmptyString(preferencesKey)) {
		reportIssue(
			issues,
			[...metadataPath, 'preferencesKey'],
			'preferencesKey must be a non-empty string when provided.',
			preferencesKey
		);
	}

	const config = buildConfig<TItem, TQuery>(rawConfig, issues, metadataPath);

	if (!config || issues.length > 0) {
		return { issues };
	}

	return {
		metadata: {
			config,
			preferencesKey: preferencesKey as string | undefined,
		},
		issues,
	};
}
