import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const generatedDir = path.join(rootDir, 'docs', 'api', 'generated');

const files = await glob('**/*.md', {
        cwd: generatedDir,
        nodir: true,
        absolute: true
});

await Promise.all(
        files.map(async (file) => {
                const original = await fs.readFile(file, 'utf8');
                const lines = original.split(/\r?\n/);
                let inCodeFence = false;

                const transformed = lines
                        .map((line) => {
                                const trimmed = line.trimStart();
                                if (trimmed.startsWith('```')) {
                                        inCodeFence = !inCodeFence;
                                        return line;
                                }

                                if (inCodeFence) {
                                        return line;
                                }

                                if (!line.includes('<') && !line.includes('>')) {
                                        return line;
                                }

                                const segments = line.split(/(`+[^`]*`+)/g);

                                return segments
                                        .map((segment) => {
                                                if (segment.startsWith('`')) {
                                                        return segment;
                                                }

                                                return segment
                                                        .replace(/</g, '&lt;')
                                                        .replace(/>/g, '&gt;');
                                        })
                                        .join('');
                        })
                        .join('\n');

                if (transformed !== original) {
                        await fs.writeFile(file, transformed, 'utf8');
                }
        })
);
