#!/usr/bin/env node

/**
 * Post-format script: Normalize em dashes to hyphens in markdown files
 * This runs after Prettier to enforce consistent punctuation
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('**/*.md', {
	ignore: [
		'**/node_modules/**',
		'**/dist/**',
		'**/build/**',
		'**/coverage/**',
	],
});

let totalReplacements = 0;

files.forEach((file) => {
	try {
		const content = readFileSync(file, 'utf8');
		const normalized = content.replace(/—/g, '-');

		if (content !== normalized) {
			writeFileSync(file, normalized, 'utf8');
			const count = (content.match(/—/g) || []).length;
			totalReplacements += count;
			console.log(`✓ ${file}: replaced ${count} em dash(es)`);
		}
	} catch (err) {
		console.error(`✗ ${file}: ${err.message}`);
	}
});

if (totalReplacements > 0) {
	console.log(
		`\nTotal: ${totalReplacements} em dash(es) normalized to hyphens`
	);
} else {
	console.log('No em dashes found - all files already normalized');
}
