export function createPhpNamespace(namespace: string): string {
	const segments = namespace.split('-').filter(Boolean);
	if (segments.length === 0) {
		return 'WPKernel';
	}

	const converted: string[] = [];
	for (let index = 0; index < segments.length; index += 1) {
		const current = segments[index]!;
		const next = segments[index + 1];

		if (
			current.toLowerCase() === 'wp' &&
			next?.toLowerCase() === 'kernel'
		) {
			converted.push('WPKernel');
			index += 1;
			continue;
		}

		if (current.toLowerCase() === 'wp') {
			converted.push('WP');
			continue;
		}

		converted.push(current.charAt(0).toUpperCase() + current.slice(1));
	}

	if (converted.length === 1) {
		return converted[0]!;
	}

	const head = converted.slice(0, -1).join('\\');
	return `${head}\\${converted.at(-1)!}`;
}
