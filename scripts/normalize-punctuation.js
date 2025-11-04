#!/usr/bin/env node

/**
 * Post-format script: Normalize characters in markdown files
 * This runs after Prettier to enforce consistent punctuation/symbols
 */

/* eslint-disable import/no-extraneous-dependencies -- scripts run in the dev toolchain */
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';
import { finished } from 'node:stream/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { glob } from 'glob';
import { LogLayer, ConsoleTransport } from 'loglayer';
/* eslint-enable import/no-extraneous-dependencies */

const logger = new LogLayer({
	transport: new ConsoleTransport({
		id: 'normalize-punctuation',
		logger: console,
		level: 'info',
	}),
});

// --- CONFIGURATION ARRAY ---
// Define replacements as an array of objects.
// Each object must have a 'search' RegExp (or string) and a 'replace' string.
const REPLACEMENTS = [
	// Example 1: Em-dash normalization
	{
		name: 'em dash',
		search: /-/g, // The character to find (em dash)
		replace: '-', // The character to use instead (hyphen)
	},
	// Example 2: The exact replacements you asked for (e.g., green checkmark to black checkmark)
	// Note: The specific Unicode character for a checkmark is U+2714 (✓)
	{
		name: 'colored checkmark',
		search: /✅/g, // The colored checkmark (U+2705)
		replace: '✓', // The simple black checkmark (U+2714)
	},
	// Example 3: Colored cross to simple black cross
	// Note: The specific Unicode character for the cross mark is U+2716 (✗) or U+2715 (✕)
	{
		name: 'colored cross mark',
		search: /❌/g, // The colored cross mark (U+274C)
		replace: '✗', // The black cross mark (U+2717)
	},
	// Add any other replacements here:
	// {
	//   name: 'copyright symbol',
	//   search: /\(c\)/g,
	//   replace: '©',
	// },
];

const IGNORE_PATTERNS = [
	'**/node_modules/**',
	'**/dist/**',
	'**/build/**',
	'**/coverage/**',
];

function resolveParallelism() {
	const available =
		typeof os.availableParallelism === 'function'
			? os.availableParallelism()
			: 0;

	if (available > 0) {
		return Math.min(8, Math.max(1, available));
	}

	const cpuCount = Array.isArray(os.cpus()) ? os.cpus().length : 0;
	const fallback = cpuCount > 0 ? cpuCount : 4;

	return Math.min(8, Math.max(1, fallback));
}

async function hasTrailingNewline(filePath) {
	const handle = await fs.open(filePath, 'r');
	try {
		const stats = await handle.stat();
		if (stats.size === 0) {
			return false;
		}

		const buffer = Buffer.alloc(1);
		const { bytesRead } = await handle.read(buffer, 0, 1, stats.size - 1);
		if (bytesRead === 0) {
			return false;
		}

		return buffer[0] === 0x0a;
	} finally {
		await handle.close();
	}
}

async function removeIfExists(filePath) {
	try {
		await fs.rm(filePath);
	} catch (error) {
		if (
			!(
				error &&
				typeof error === 'object' &&
				'code' in error &&
				error.code === 'ENOENT'
			)
		) {
			throw error;
		}
	}
}

function applyReplacement(line, replacement) {
	if (typeof replacement.search === 'string') {
		if (!line.includes(replacement.search)) {
			return { text: line, count: 0 };
		}

		const segments = line.split(replacement.search);
		return {
			text: segments.join(replacement.replace),
			count: segments.length - 1,
		};
	}

	const matches = line.match(replacement.search);
	if (!matches || matches.length === 0) {
		return { text: line, count: 0 };
	}

	return {
		text: line.replace(replacement.search, replacement.replace),
		count: matches.length,
	};
}

function normalizeLine(line, fileCounts) {
	let updatedLine = line;
	let mutated = false;

	for (const replacement of REPLACEMENTS) {
		const { text, count } = applyReplacement(updatedLine, replacement);
		if (count === 0) {
			continue;
		}

		updatedLine = text;
		fileCounts.set(
			replacement.name,
			(fileCounts.get(replacement.name) ?? 0) + count
		);
		mutated = true;
	}

	return { text: updatedLine, mutated };
}

async function normalizeStream({
	rl,
	readStream,
	writeStream,
	trailingNewline,
	fileCounts,
}) {
	let changed = false;
	let firstLine = true;

	for await (const line of rl) {
		const { text, mutated } = normalizeLine(line, fileCounts);

		if (firstLine) {
			firstLine = false;
		} else {
			writeStream.write('\n');
		}

		if (!changed && (mutated || text !== line)) {
			changed = true;
		}

		writeStream.write(text);
	}

	if (trailingNewline) {
		writeStream.write('\n');
	}

	writeStream.end();
	await Promise.all([finished(writeStream), finished(readStream)]);

	return changed;
}

async function finalizeNormalizedFile(tempFile, filePath, totals, fileCounts) {
	try {
		await fs.rename(tempFile, filePath);
	} catch (error) {
		await removeIfExists(tempFile);
		throw error;
	}

	for (const [name, count] of fileCounts) {
		totals.set(name, (totals.get(name) ?? 0) + count);
	}

	const summary = Array.from(fileCounts.entries())
		.map(([name, count]) => `${count} ${name}(s)`)
		.join(', ');

	logger.info('Normalized punctuation', {
		file: path.relative(process.cwd(), filePath),
		summary,
	});
}

async function processFile(filePath, totals) {
	const tempFile = `${filePath}.${randomUUID()}.tmp`;
	const trailingNewline = await hasTrailingNewline(filePath);
	const readStream = createReadStream(filePath, { encoding: 'utf8' });
	const rl = createInterface({ input: readStream, crlfDelay: Infinity });
	const writeStream = createWriteStream(tempFile, { encoding: 'utf8' });
	const fileCounts = new Map();

	try {
		const changed = await normalizeStream({
			rl,
			readStream,
			writeStream,
			trailingNewline,
			fileCounts,
		});

		if (!changed) {
			await removeIfExists(tempFile);
			return;
		}

		await finalizeNormalizedFile(tempFile, filePath, totals, fileCounts);
	} catch (error) {
		writeStream.destroy();
		readStream.destroy();
		await removeIfExists(tempFile);
		throw error;
	}
}

async function runWithConcurrency(items, limit, worker) {
	if (items.length === 0) {
		return;
	}

	let index = 0;
	const runners = Array.from(
		{ length: Math.min(limit, items.length) },
		async () => {
			while (true) {
				const current = index;
				if (current >= items.length) {
					break;
				}
				index += 1;
				await worker(items[current]);
			}
		}
	);

	await Promise.all(runners);
}

async function main() {
	const totals = new Map();
	const files = await glob('**/*.md', {
		ignore: IGNORE_PATTERNS,
		nodir: true,
		absolute: true,
	});

	const concurrency = resolveParallelism();
	await runWithConcurrency(files, concurrency, async (file) => {
		try {
			await processFile(file, totals);
		} catch (error) {
			logger.error('Failed to normalize file', {
				file: path.relative(process.cwd(), file),
				error,
			});
		}
	});

	if (totals.size === 0) {
		logger.info(
			'No characters found for normalization - all files already clean'
		);
		return;
	}

	let grandTotal = 0;
	const summary = [];
	for (const [name, count] of totals) {
		grandTotal += count;
		summary.push(`• ${count} total ${name}(s) normalized`);
	}

	logger.info('Normalization summary', {
		totalReplacements: grandTotal,
		details: summary,
	});
}

main().catch((error) => {
	logger.error('Normalization script failed', { error });
	process.exitCode = 1;
});
