import type { PhpStmt } from './nodes';
import type { PhpFileBuilder } from './programBuilder';
import type { PhpPrintable } from './printables';
import type { PhpClassTemplate, PhpMethodTemplate } from './templates';

export function appendMethodTemplates(
	builder: PhpFileBuilder,
	methods: readonly PhpMethodTemplate[]
): void {
	methods.forEach((method, index) => {
		method.forEach((line) => {
			builder.appendStatement(line);
		});

		if (method.node) {
			builder.appendProgramStatement(method.node);
		}

		if (index < methods.length - 1) {
			builder.appendStatement('');
		}
	});
}

export function appendClassTemplate(
	builder: PhpFileBuilder,
	template: PhpClassTemplate
): void {
	appendPrintable(builder, template);
}

export function appendPrintable(
	builder: PhpFileBuilder,
	printable: PhpPrintable<PhpStmt>
): void {
	printable.lines.forEach((line) => {
		builder.appendStatement(line);
	});

	builder.appendProgramStatement(printable.node);
}
