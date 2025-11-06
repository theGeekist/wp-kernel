/**
 * Lazy loader for ts-morph to reduce CLI install size.
 *
 * ts-morph (~12MB) + typescript (~23MB) = ~35MB that only runs during `wpk generate`,
 * not during `npm create @wpkernel/wpk` bootstrap. By lazy-loading, we defer this
 * heavy dependency until the builder actually executes.
 *
 * @module
 */

import type * as tsMorphModule from 'ts-morph';

let tsMorphPromise: Promise<typeof tsMorphModule> | null = null;

/**
 * Dynamically imports ts-morph module on first use.
 * Caches the promise to avoid multiple imports.
 *
 * @returns Promise resolving to the ts-morph module
 */
export async function loadTsMorph(): Promise<typeof tsMorphModule> {
	if (!tsMorphPromise) {
		tsMorphPromise = import('ts-morph');
	}

	return tsMorphPromise;
}
