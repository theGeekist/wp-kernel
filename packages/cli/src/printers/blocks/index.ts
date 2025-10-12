/**
 * Block Printers
 *
 * Generates registration code for WordPress blocks from IR.
 * Handles both JS-only blocks (Phase 3A) and SSR blocks (Phase 3B).
 *
 * @module printers/blocks
 */

export * from './types.js';
export * from './js-only.js';
export * from './ssr.js';
