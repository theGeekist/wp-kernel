export function createPhpNamespace(namespace: string): string {
	const segments = namespace.split('-').filter(Boolean);
	if (segments.length === 0) {
		return 'WPKernel';
	}

	const converted = segments.map((segment) => {
		if (segment.toLowerCase() === 'wp') {
			return 'WP';
		}

		return segment.charAt(0).toUpperCase() + segment.slice(1);
	});

	if (converted.length === 1) {
		return converted[0]!;
	}

	const head = converted.slice(0, -1).join('\\');
	return `${head}\\${converted.at(-1)!}`;
}
