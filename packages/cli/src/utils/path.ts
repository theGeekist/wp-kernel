import { resolve } from 'node:path';

export function resolveFromWorkspace(...segments: string[]): string {
	return resolve(process.cwd(), ...segments);
}
