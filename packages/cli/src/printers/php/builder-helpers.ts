import type { PhpFileBuilder } from './builder';

export function appendMethodTemplates(
	builder: PhpFileBuilder,
	methods: readonly string[][]
): void {
	methods.forEach((method, index) => {
		method.forEach((line) => {
			builder.appendStatement(line);
		});

		if (index < methods.length - 1) {
			builder.appendStatement('');
		}
	});
}
