import path from 'path';

/* eslint-disable import/no-default-export */

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/packages/cli/mvp-cli-spec.md#6-blocks-of-authoring-safety';

function isKernelConfigFile(filename) {
	return filename && path.basename(filename) === 'kernel.config.ts';
}

function findKernelConfigStatement(program) {
	for (const statement of program.body) {
		if (
			statement.type === 'ExportNamedDeclaration' &&
			statement.declaration
		) {
			const result = findInDeclaration(statement.declaration);
			if (result) {
				return statement;
			}
		} else if (statement.type === 'VariableDeclaration') {
			const result = findInDeclaration(statement);
			if (result) {
				return statement;
			}
		}
	}

	return null;
}

function findInDeclaration(declaration) {
	if (declaration.type !== 'VariableDeclaration') {
		return null;
	}

	return declaration.declarations.find(
		(declarator) =>
			declarator.id.type === 'Identifier' &&
			declarator.id.name === 'kernelConfig'
	);
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Encourages kernel configs to reference official CLI documentation near the export.',
			recommended: false,
			url: DOC_URL,
		},
		hasSuggestions: true,
		messages: {
			missingDocComment:
				'Add a documentation reference comment for kernelConfig. Developers resolving lint diagnostics should review {{docUrl}}.',
			addDocComment: 'Insert CLI docs link comment.',
		},
		schema: [],
	},
	create(context) {
		const filename = context.getFilename();
		if (!isKernelConfigFile(filename)) {
			return {};
		}

		return {
			Program(node) {
				const statement = findKernelConfigStatement(node);
				if (!statement) {
					return;
				}

				const sourceCode = context.getSourceCode();
				const comments = sourceCode.getCommentsBefore(statement);
				const hasDocComment = comments.some((comment) =>
					comment.value.includes(DOC_URL)
				);

				if (hasDocComment) {
					return;
				}

				context.report({
					node: statement,
					messageId: 'missingDocComment',
					data: {
						docUrl: DOC_URL,
					},
					suggest: [
						{
							messageId: 'addDocComment',
							fix(fixer) {
								const text = `// For CLI config guidance see ${DOC_URL}\n`;
								return fixer.insertTextBefore(statement, text);
							},
						},
					],
				});
			},
		};
	},
};
