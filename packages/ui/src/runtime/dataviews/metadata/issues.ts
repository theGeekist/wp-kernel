import {
	DATA_VIEWS_METADATA_INVALID,
	type DataViewMetadataIssue,
	type MetadataPath,
} from './types';

export function reportIssue(
	issues: DataViewMetadataIssue[],
	path: MetadataPath,
	message: string,
	received?: unknown
): undefined {
	issues.push({
		code: DATA_VIEWS_METADATA_INVALID,
		path,
		message,
		received,
	});

	return undefined;
}
