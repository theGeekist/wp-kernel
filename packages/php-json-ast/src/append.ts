import type { PhpStmt } from './nodes';
import type { PhpAstBuilderAdapter } from './programBuilder';
import type { PhpPrintable } from './printables';
import type { PhpClassTemplate, PhpMethodTemplate } from './templates';

export function appendMethodTemplates(
	builder: PhpAstBuilderAdapter,
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
	builder: PhpAstBuilderAdapter,
	template: PhpClassTemplate
): void {
	appendPrintable(builder, template);
}

export function appendPrintable(
	builder: PhpAstBuilderAdapter,
	printable: PhpPrintable<PhpStmt>
): void {
	printable.lines.forEach((line) => {
		builder.appendStatement(line);
	});

	builder.appendProgramStatement(printable.node);
}
