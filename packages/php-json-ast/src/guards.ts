import {
	EMPTY_PHP_ATTRIBUTES,
	isPhpAttributes,
	normalisePhpAttributes,
} from './attributes';
import type { PhpJsonNode, PhpJsonProgram } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') {
		return false;
	}

	if (Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function isPhpJsonNode(value: unknown): value is PhpJsonNode {
	if (!isPlainObject(value)) {
		return false;
	}

	if (typeof value.nodeType !== 'string' || value.nodeType.length === 0) {
		return false;
	}

	if ('attributes' in value && !isPhpAttributes(value.attributes)) {
		return false;
	}

	return true;
}

export function asPhpJsonNode(value: unknown): PhpJsonNode {
	if (!isPhpJsonNode(value)) {
		throw new TypeError('Expected a PhpJsonNode-compatible object.');
	}

	return {
		...value,
		attributes:
			'attributes' in value
				? normalisePhpAttributes(value.attributes)
				: EMPTY_PHP_ATTRIBUTES,
	} as PhpJsonNode;
}

export function isPhpJsonProgram(value: unknown): value is PhpJsonProgram {
	if (!isPhpJsonNode(value)) {
		return false;
	}

	if (value.nodeType !== 'stmt_program') {
		return false;
	}

	const statementsCandidate = (value as Record<string, unknown>).statements;

	if (!Array.isArray(statementsCandidate)) {
		return false;
	}

	return statementsCandidate.every((statement) => isPhpJsonNode(statement));
}

export function getPhpProgramStatements(
	program: PhpJsonProgram
): readonly PhpJsonNode[] {
	return program.statements;
}
