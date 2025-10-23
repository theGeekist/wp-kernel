export const PHP_INDENT = '        ';

export class PhpMethodBodyBuilder {
	private readonly lines: string[] = [];

	public constructor(
		private readonly indentUnit: string,
		private readonly indentLevel: number
	) {}

	public line(content = ''): void {
		if (content === '') {
			this.lines.push('');
			return;
		}

		const indent = this.indentUnit.repeat(this.indentLevel);
		this.lines.push(`${indent}${content}`);
	}

	public raw(content: string): void {
		this.lines.push(content);
	}

	public blank(): void {
		this.lines.push('');
	}

	public toLines(): string[] {
		return [...this.lines];
	}
}

export interface PhpMethodTemplateOptions {
	signature: string;
	indentLevel: number;
	docblock?: string[];
	indentUnit?: string;
	body: (body: PhpMethodBodyBuilder) => void;
}

export function assembleMethodTemplate(
	options: PhpMethodTemplateOptions
): string[] {
	const indentUnit = options.indentUnit ?? PHP_INDENT;
	const indent = indentUnit.repeat(options.indentLevel);
	const lines: string[] = [];

	if (options.docblock?.length) {
		lines.push(`${indent}/**`);
		for (const docLine of options.docblock) {
			lines.push(`${indent} * ${docLine}`);
		}
		lines.push(`${indent} */`);
	}

	lines.push(`${indent}${options.signature}`);
	lines.push(`${indent}{`);

	const bodyBuilder = new PhpMethodBodyBuilder(
		indentUnit,
		options.indentLevel + 1
	);
	options.body(bodyBuilder);
	const bodyLines = bodyBuilder.toLines();
	if (bodyLines.length > 0) {
		lines.push(...bodyLines);
	}

	lines.push(`${indent}}`);

	return lines;
}
