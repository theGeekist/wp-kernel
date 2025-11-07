import path from 'path';

const DOC_URL =
	'https://github.com/theGeekist/wp-kernel/blob/main/docs/internal/cli-migration-phases.md#authoring-safety-lint-rules';

function isWPKernelConfigFile(filename) {
	return filename && path.basename(filename) === 'wpk.config.ts';
}

function findWPKernelConfigStatement(program) {
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
			declarator.id.name === 'wpkConfig'
	);
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Encourages wpk configs to reference official CLI documentation near the export.',
			recommended: false,
			url: DOC_URL,
		},
		hasSuggestions: true,
		messages: {
			missingDocComment:
				'wpk.config.ts is missing a documentation reference comment. ' +
				'This file defines the contract between your application and the framework-resources, routes, storage, and capabilities. ' +
				"A @see link helps your team understand the framework's expectations and quickly reference the spec during code reviews. " +
				'Fix: Add /** @see {{docUrl}} */ above the wpkConfig export. ' +
				'The CLI generators preserve these comments in scaffolded code.',
			addDocComment: 'Insert CLI docs link comment.',
		},
		schema: [],
	},
	create(context) {
		const filename = context.getFilename();
		if (!isWPKernelConfigFile(filename)) {
			return {};
		}

		return {
			Program(node) {
				const statement = findWPKernelConfigStatement(node);
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

				// Framework best practice: wpk.config.ts should link to framework documentation.
				// This file is the central contract defining resources, routes, storage, and capabilities.
				// A @see comment helps developers understand the framework's expectations during code
				// reviews and makes it easier to onboard new team members. CLI generators preserve these.
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
