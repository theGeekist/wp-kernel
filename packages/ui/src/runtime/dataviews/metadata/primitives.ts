import type { DataViewMetadataIssue, MetadataPath } from './types';
import { reportIssue } from './issues';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function cloneShallow<T>(value: T): T {
	if (!value || typeof value !== 'object') {
		return value;
	}

	return { ...(value as Record<string, unknown>) } as unknown as T;
}

export function normalizeNonEmptyString(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath,
	message: string
): string | undefined {
	if (!isNonEmptyString(value)) {
		return reportIssue(issues, path, message, value);
	}

	return value;
}

export function normalizeBoolean(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath,
	message: string
): boolean | undefined {
	if (typeof value !== 'boolean') {
		return reportIssue(issues, path, message, value);
	}

	return value;
}

export function normalizeFunctionValue<TValue>(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath,
	message: string
): TValue | undefined {
	if (typeof value !== 'function') {
		return reportIssue(issues, path, message, value);
	}

	return value as TValue;
}

export function normalizeNumber(
	value: unknown,
	issues: DataViewMetadataIssue[],
	path: MetadataPath,
	message: string
): number | undefined {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return reportIssue(issues, path, message, value);
	}

	return value;
}

export function applyOptional<TValue>(
	source: Record<string, unknown>,
	key: string,
	basePath: MetadataPath,
	normalize: (candidate: unknown, path: MetadataPath) => TValue | undefined,
	assign: (value: TValue) => void
): boolean {
	if (!(key in source)) {
		return true;
	}

	const normalized = normalize(source[key], [...basePath, key]);

	if (normalized === undefined) {
		return false;
	}

	assign(normalized);
	return true;
}
