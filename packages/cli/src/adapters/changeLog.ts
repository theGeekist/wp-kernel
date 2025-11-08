import { hashCanonical } from '../ir/shared/canonical';
import type { IRAdapterChangeOperation, IRv1 } from '../ir/publicTypes';

function isPrimitive(
	value: unknown
): value is string | number | boolean | null {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

function createStructureOperation(
	path: string,
	before: unknown,
	after: unknown
): IRAdapterChangeOperation | null {
	if (before === undefined && after === undefined) {
		return null;
	}

	if (before === undefined) {
		return { op: 'add', path, after };
	}

	if (after === undefined) {
		return { op: 'remove', path, before };
	}

	if (isPrimitive(before) && isPrimitive(after)) {
		if (before === after) {
			return null;
		}

		return { op: 'update', path, before, after };
	}

	const beforeHash = hashCanonical(before);
	const afterHash = hashCanonical(after);

	if (beforeHash === afterHash) {
		return null;
	}

	return {
		op: 'replace-structure',
		path,
		beforeHash,
		afterHash,
	} satisfies IRAdapterChangeOperation;
}

export function diffIr(previous: IRv1, next: IRv1): IRAdapterChangeOperation[] {
	const operations: IRAdapterChangeOperation[] = [];
	const previousRecord = previous as unknown as Record<string, unknown>;
	const nextRecord = next as unknown as Record<string, unknown>;
	const keys = new Set([
		...Object.keys(previousRecord),
		...Object.keys(nextRecord),
	]);

	for (const key of keys) {
		const op = createStructureOperation(
			`/${key}`,
			previousRecord[key],
			nextRecord[key]
		);

		if (op) {
			operations.push(op);
		}
	}

	return operations;
}
