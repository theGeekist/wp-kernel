import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { finished } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const generatedDir = path.join(rootDir, 'docs', 'api', '@wpkernel');

function transformLine(line, inCodeFence) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('```')) {
                return { text: line, inCodeFence: !inCodeFence };
        }

        let text = line;

        if (!inCodeFence) {
                text = text.replace(
                        /^(\s*#\s+Type Alias:\s+[^(]+)\(\)(.*)$/u,
                        '$1$2'
                );
        }

        let escaped = text;
        if (!inCodeFence) {
                escaped = escaped.replace(/\\([<>])/g, '$1');
        }

        escaped = escaped.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return { text: escaped, inCodeFence };
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
                if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
                        throw error;
                }
        }
}

async function processFile(filePath) {
        const trailingNewline = await hasTrailingNewline(filePath);
        const tempFile = `${filePath}.${randomUUID()}.tmp`;
        const readStream = createReadStream(filePath, { encoding: 'utf8' });
        const rl = createInterface({ input: readStream, crlfDelay: Infinity });
        const writeStream = createWriteStream(tempFile, { encoding: 'utf8' });

        let inCodeFence = false;
        let changed = false;
        let firstLine = true;

        try {
                for await (const line of rl) {
                        const { text, inCodeFence: nextState } = transformLine(line, inCodeFence);
                        inCodeFence = nextState;

                        if (!firstLine) {
                                writeStream.write('\n');
                        } else {
                                firstLine = false;
                        }

                        // Force changed to true if angle brackets are present, for debugging
                        if (line.includes('<') || line.includes('>')) {
                            changed = true;
                        } else if (!changed && text !== line) {
                            changed = true;
                        }

                        writeStream.write(text);
                }

                if (trailingNewline) {
                        writeStream.write('\n');
                }

                writeStream.end();
                await Promise.all([finished(writeStream), finished(readStream)]);
        } catch (error) {
                writeStream.destroy();
                readStream.destroy();
                await removeIfExists(tempFile);
                throw error;
        }

        // Always rename the file, even if no changes were detected by text !== line
        // This ensures the file is always overwritten, for debugging purposes
        await fs.rename(tempFile, filePath);
}

function resolveConcurrencyLimit() {
        const parallelism =
                typeof os.availableParallelism === 'function'
                        ? os.availableParallelism()
                        : Array.isArray(os.cpus()) && os.cpus().length > 0
                                ? os.cpus().length
                                : 4;

        return Math.min(8, Math.max(1, parallelism));
}

async function runWithConcurrency(items, limit, worker) {
        if (items.length === 0) {
                return;
        }

        let index = 0;

        const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
                while (true) {
                        const currentIndex = index;
                        if (currentIndex >= items.length) {
                                break;
                        }
                        index += 1;
                        await worker(items[currentIndex]);
                }
        });

        await Promise.all(runners);
}

const files = await glob('**/*.md', {
        cwd: generatedDir,
        nodir: true,
        absolute: true,
});

await runWithConcurrency(files, resolveConcurrencyLimit(), processFile);
