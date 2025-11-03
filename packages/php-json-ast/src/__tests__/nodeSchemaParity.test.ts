import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const TEST_ROOT = __dirname;
const SRC_ROOT = path.resolve(TEST_ROOT, '..');
const NODES_ROOT = path.resolve(SRC_ROOT, 'nodes');
const PHP_HELPER = path.resolve(SRC_ROOT, '..', 'php', 'dump-subnodes.php');
const PHP_VENDOR_AUTOLOAD = path.resolve(
	SRC_ROOT,
	'..',
	'vendor',
	'autoload.php'
);

describe('PhpParser node parity', () => {
	it('matches PhpParser::getSubNodeNames for known node interfaces', () => {
		if (!existsSync(PHP_VENDOR_AUTOLOAD)) {
			return;
		}

		const schemas = collectTypeScriptNodeSchemas();
		const nodeTypes = Array.from(schemas.keys()).sort();

		const phpSchemaMap = fetchPhpNodeSchema(nodeTypes);

		const missingSchemas: string[] = [];
		const mismatches: string[] = [];

		for (const nodeType of nodeTypes) {
			const schema = schemas.get(nodeType);
			const phpSchema = phpSchemaMap[nodeType];

			if (!schema || !phpSchema) {
				missingSchemas.push(
					`${nodeType} -> ${schema?.interfaceName ?? 'unknown'} (${schema?.filePath ?? 'unknown'})`
				);
				continue;
			}

			const missing = phpSchema.subNodeNames.filter(
				(name: string) => !schema.properties.has(name)
			);

			if (missing.length > 0) {
				mismatches.push(
					`${schema.interfaceName} (${nodeType}) -> missing [${missing.join(', ')}]`
				);
			}
		}

		if (missingSchemas.length > 0 || mismatches.length > 0) {
			const messages = [];
			if (missingSchemas.length > 0) {
				messages.push(
					`Missing PhpParser schema for: ${missingSchemas.join('; ')}`
				);
			}
			if (mismatches.length > 0) {
				messages.push(`Property mismatches: ${mismatches.join('; ')}`);
			}

			throw new Error(messages.join('\n'));
		}
	});
});

type InterfaceSchema = {
	readonly interfaceName: string;
	readonly filePath: string;
	readonly properties: Set<string>;
};

type InterfaceMetadata = {
	readonly interfaceName: string;
	readonly filePath: string;
	readonly extends: readonly string[];
	readonly ownProperties: readonly string[];
	readonly nodeType: string | null;
	properties?: Set<string>;
};

function collectTypeScriptNodeSchemas(): Map<string, InterfaceSchema> {
	const files = collectTypeScriptFiles(NODES_ROOT);

	const interfaces = new Map<string, InterfaceMetadata>();

	for (const filePath of files) {
		const source = ts.createSourceFile(
			filePath,
			fs.readFileSync(filePath, 'utf8'),
			ts.ScriptTarget.ESNext,
			true
		);

		source.forEachChild((node) => {
			if (!ts.isInterfaceDeclaration(node)) {
				return;
			}

			const interfaceName = node.name.text;
			const extendsNames = extractExtendsNames(node);
			const ownProperties: string[] = [];
			let nodeType: string | null = null;

			for (const member of node.members) {
				if (!ts.isPropertySignature(member) || !member.name) {
					continue;
				}

				const propertyName = getPropertyName(member.name, source);

				if (propertyName === 'nodeType') {
					const literal = extractStringLiteral(member.type);
					if (literal) {
						nodeType = literal;
					}
					continue;
				}

				if (propertyName === 'attributes') {
					continue;
				}

				ownProperties.push(propertyName);
			}

			interfaces.set(interfaceName, {
				interfaceName,
				filePath,
				extends: extendsNames,
				ownProperties,
				nodeType,
			});
		});
	}

	const schemaByNodeType = new Map<string, InterfaceSchema>();

	for (const metadata of interfaces.values()) {
		if (!metadata.nodeType) {
			continue;
		}

		const properties = collectInterfaceProperties(
			metadata,
			interfaces,
			new Set()
		);

		schemaByNodeType.set(metadata.nodeType, {
			interfaceName: metadata.interfaceName,
			filePath: metadata.filePath,
			properties,
		});
	}

	return schemaByNodeType;
}

function collectInterfaceProperties(
	metadata: InterfaceMetadata,
	interfaces: Map<string, InterfaceMetadata>,
	seen: Set<string>
): Set<string> {
	if (metadata.properties) {
		return metadata.properties;
	}

	const properties = new Set(metadata.ownProperties);
	seen.add(metadata.interfaceName);

	for (const parentName of metadata.extends) {
		if (seen.has(parentName)) {
			continue;
		}

		const parent = interfaces.get(parentName);
		if (!parent) {
			continue;
		}

		const parentProperties = collectInterfaceProperties(
			parent,
			interfaces,
			seen
		);
		for (const property of parentProperties) {
			properties.add(property);
		}
	}

	metadata.properties = properties;
	return properties;
}

function extractExtendsNames(node: ts.InterfaceDeclaration): string[] {
	if (!node.heritageClauses) {
		return [];
	}

	const names: string[] = [];

	for (const clause of node.heritageClauses) {
		if (clause.token !== ts.SyntaxKind.ExtendsKeyword) {
			continue;
		}

		for (const type of clause.types) {
			const expression = type.expression.getText();
			if (expression) {
				names.push(expression);
			}
		}
	}

	return names;
}

function getPropertyName(name: ts.PropertyName, source: ts.SourceFile): string {
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	) {
		return name.text;
	}

	return name.getText(source);
}

function extractStringLiteral(node: ts.TypeNode | undefined): string | null {
	if (!node || !ts.isLiteralTypeNode(node)) {
		return null;
	}

	const literal = node.literal;
	return ts.isStringLiteral(literal) ? literal.text : null;
}

function collectTypeScriptFiles(directory: string): string[] {
	const entries = fs.readdirSync(directory, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const resolved = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectTypeScriptFiles(resolved));
			continue;
		}

		if (!entry.isFile() || !resolved.endsWith('.ts')) {
			continue;
		}

		files.push(resolved);
	}

	return files;
}

function fetchPhpNodeSchema(
	nodeTypes: readonly string[]
): Record<string, { subNodeNames: string[] }> {
	const result = spawnSync('php', [PHP_HELPER], {
		input: JSON.stringify(nodeTypes),
		encoding: 'utf8',
	});

	if (result.status !== 0) {
		const stderr = result.stderr?.trim();
		const stdout = result.stdout?.trim();
		const errorDetails = [
			`status=${result.status ?? 'unknown'}`,
			stderr ? `stderr=${stderr}` : null,
			stdout ? `stdout=${stdout}` : null,
			result.error ? `error=${result.error.message}` : null,
		]
			.filter(Boolean)
			.join(', ');

		throw new Error(
			errorDetails
				? `Failed to execute dump-subnodes.php (${errorDetails})`
				: 'Failed to execute dump-subnodes.php'
		);
	}

	if (!result.stdout) {
		return {};
	}

	return JSON.parse(result.stdout);
}
