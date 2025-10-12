#!/usr/bin/env node
/**
 * Truncate overlong inline code spans (single `…` and double ``…``) while
 * preserving both the BEGINNING and END of the span, inserting a middle marker.
 *
 * - Targets only single (`…`) and double (``…``) backtick spans on a single line
 * - Leaves triple-fence lines (```...) alone
 * - Default MAX=500 chars per span; defaults favour the TAIL (decision context)
 * - Splits kept content into HEAD and TAIL and joins with a MARKER (default: ' …<cut>… ')
 *
 * Usage:
 *   node scripts/fix-codex-fences.mjs ./codex.task-log.md [--max=500] [--head=150] [--tail=350] [--marker=' …<cut>… ']
 */

import fs from 'node:fs';

const file = process.argv[2] || './codex.task-log.md';
const maxArg = process.argv.find(a => a.startsWith('--max=')) || '--max=500';
const headArg = process.argv.find(a => a.startsWith('--head=')) || '';
const tailArg = process.argv.find(a => a.startsWith('--tail=')) || '';
const markArg = process.argv.find(a => a.startsWith('--marker=')) || '';
const MAX = Number(maxArg.split('=')[1]) || 500;
const HEAD_DEFAULT = 150;
const TAIL_DEFAULT = 350;
const HEAD = headArg ? Number(headArg.split('=')[1]) : HEAD_DEFAULT;
const TAIL = tailArg ? Number(tailArg.split('=')[1]) : TAIL_DEFAULT;
const MARKER = markArg ? markArg.slice('--marker='.length) : ' …<cut>… ';

// Truncate preserving HEAD and TAIL, inserting MARKER in the middle
function truncateEnds(s, max, head, tail, marker) {
	const a = Array.from(s);
	if (a.length <= max) return { text: s, didTruncate: false };
	let h = Math.max(0, head);
	let t = Math.max(0, tail);
	if (!headArg && !tailArg) {
		h = Math.floor(max * 0.3);
		t = max - h;
	} else {
		if (h + t > max) t = Math.max(0, max - h);
	}
	const headPart = a.slice(0, h).join('');
	const tailPart = a.slice(a.length - t).join('');
	return { text: headPart + marker + tailPart, didTruncate: true };
}

// Find closing run of backticks with same length, not part of a longer run
function findClosing(line, startIdx, runLen) {
	const needle = '`'.repeat(runLen);
	let i = startIdx;
	for (; ;) {
		const j = line.indexOf(needle, i);
		if (j === -1) return -1;
		const before = j > 0 ? line[j - 1] : '';
		const after = j + runLen < line.length ? line[j + runLen] : '';
		if (before !== '`' && after !== '`') return j;
		i = j + 1;
	}
}

function processLine(line) {
	if (/^\s*```/.test(line)) return line; // leave triple-fence lines

	let out = '';
	let i = 0;
	const L = line.length;

	while (i < L) {
		if (line[i] !== '`') {
			out += line[i++];
			continue;
		}

		let j = i;
		while (j < L && line[j] === '`') j++;
		const runLen = j - i;

		if (runLen < 1 || runLen > 2) {
			out += line.slice(i, j);
			i = j;
			continue;
		}

		if (i > 0 && line[i - 1] === '`') {
			out += line[i];
			i++;
			continue;
		}

		const close = findClosing(line, j, runLen);
		if (close === -1) {
			out += line.slice(i, j);
			i = j;
			continue;
		}

		const inner = line.slice(j, close);
		const closingEnd = close + runLen;

		if (runLen === 1 && line[closingEnd] === '`') {
			out += line[i];
			i++;
			continue;
		}

		const { text: innerOut } = truncateEnds(inner, MAX, HEAD, TAIL, MARKER);
		out += '`'.repeat(runLen) + innerOut + '`'.repeat(runLen);

		i = closingEnd;
	}

	return out;
}

if (!fs.existsSync(file)) {
	console.error(`File not found: ${file}`);
	process.exit(1);
}

const input = fs.readFileSync(file, 'utf8');
const out = input.split('\n').map(processLine).join('\n');
fs.writeFileSync(file, out, 'utf8');
console.log(`Normalized: ${file} (max=${MAX}, head=${HEAD}, tail=${TAIL}, marker=${JSON.stringify(MARKER)})`);