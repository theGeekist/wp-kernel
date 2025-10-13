/**
 * ESLint rule: prefer-submodule-import
 * Flags imports from main package entrypoints (e.g. '@geekist/wp-kernel') and suggests using submodule imports (e.g. '@geekist/wp-kernel/resource').
 */

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Prefer importing from submodules instead of main package entrypoint for tree-shaking and smaller bundles.',
			category: 'Best Practices',
			recommended: false,
		},
		messages: {
			preferSubmodule:
				"Import from '{{main}}' is discouraged. Use a submodule import (e.g. '{{main}}/resource') instead.",
		},
		schema: [],
	},
	create(context) {
		// List main entrypoints to flag
		const mainEntrypoints = new Set([
			'@geekist/wp-kernel',
			'@geekist/wp-kernel-ui',
			'@geekist/wp-kernel-cli',
			'@geekist/wp-kernel-e2e-utils',
		]);

		function reportIfMain(source, node) {
			const value = source && source.value;
			if (!value) {
				return;
			}
			if (mainEntrypoints.has(value)) {
				context.report({
					node,
					messageId: 'preferSubmodule',
					data: { main: value },
				});
			}
		}

		return {
			ImportDeclaration(node) {
				// Ignore type-only imports (import type { ... } from 'x')
				if (node.importKind === 'type') {
					return;
				}
				reportIfMain(node.source, node);
			},

			// export ... from 'pkg'
			ExportAllDeclaration(node) {
				reportIfMain(node.source, node);
			},

			ExportNamedDeclaration(node) {
				if (node.source) {
					reportIfMain(node.source, node);
				}
			},
		};
	},
};
