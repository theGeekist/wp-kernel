import path from 'node:path';
import { buildPhpPrettyPrinter } from '@wpkernel/php-driver';
import {
	buildArg,
	buildBinaryOperation,
	buildBooleanNot,
	buildClass,
	buildDeclare,
	buildDeclareItem,
	buildDocComment,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpAttributes,
	type PhpExpr,
	type PhpName,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildNode } from '@wpkernel/php-json-ast/nodes/base';
import {
	AUTO_GUARD_BEGIN,
	buildPluginLoaderProgram,
} from '@wpkernel/wp-json-ast';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../runtime/types';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import { toPascalCase } from './php/utils';
import {
	buildGenerationManifestFromIr,
	type GenerationManifestDiff,
	diffGenerationState,
} from '../apply/manifest';

const PLAN_PATH = path.posix.join('.wpk', 'apply', 'plan.json');
const PLAN_BASE_ROOT = path.posix.join('.wpk', 'apply', 'base');
const PLAN_INCOMING_ROOT = path.posix.join('.wpk', 'apply', 'incoming');

type PlanInstruction =
	| {
			readonly action: 'write';
			readonly file: string;
			readonly base: string;
			readonly incoming: string;
			readonly description: string;
	  }
	| {
			readonly action: 'delete';
			readonly file: string;
			readonly description: string;
	  };

interface BuildShimOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly className: string;
	readonly generatedClassFqn: string;
	readonly requirePath: string;
}

export function createApplyPlanBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.apply.plan',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
			});

			const instructions = await collectPlanInstructions({
				options,
				prettyPrinter,
			});

			await writePlan(options, instructions);
			if (instructions.length === 0) {
				reporter.info(
					'createApplyPlanBuilder: no apply plan instructions emitted.'
				);
			} else {
				reporter.info(
					'createApplyPlanBuilder: emitted apply plan instructions.',
					{
						files: instructions.map(
							(instruction) => instruction.file
						),
					}
				);
			}

			await next?.();
		},
	});
}

async function collectPlanInstructions({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction[]> {
	const { input, reporter } = options;
	const instructions: PlanInstruction[] = [];

	await addPluginLoaderInstruction({ options, prettyPrinter, instructions });

	if ((input.ir?.resources?.length ?? 0) === 0) {
		reporter.debug(
			'createApplyPlanBuilder: no resources to generate shims for.'
		);
	}

	const resourceInstructions = await collectResourceInstructions({
		options,
		prettyPrinter,
	});
	instructions.push(...resourceInstructions);

	const nextManifest = buildGenerationManifestFromIr(input.ir ?? null);
	const diff = diffGenerationState(
		options.context.generationState,
		nextManifest
	);

	const deletionInstructions = collectDeletionInstructions(diff);
	instructions.push(...deletionInstructions);

	return instructions;
}

async function addPluginLoaderInstruction({
	options,
	prettyPrinter,
	instructions,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	readonly instructions: PlanInstruction[];
}): Promise<void> {
	const loaderInstruction = await emitPluginLoader({
		options,
		prettyPrinter,
	});
	if (loaderInstruction) {
		instructions.push(loaderInstruction);
	}
}

async function collectResourceInstructions({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction[]> {
	const resourceInstructions: PlanInstruction[] = [];

	for (const resource of options.input.ir?.resources ?? []) {
		const instruction = await emitShim({
			options,
			prettyPrinter,
			resource,
		});
		if (instruction) {
			resourceInstructions.push(instruction);
		}
	}

	return resourceInstructions;
}

function collectDeletionInstructions(
	diff: GenerationManifestDiff
): PlanInstruction[] {
	const instructions: PlanInstruction[] = [];

	for (const removed of diff.removed) {
		const uniqueShims = new Set(
			removed.shims.filter((shim): shim is string => Boolean(shim))
		);

		for (const shim of uniqueShims) {
			instructions.push({
				action: 'delete',
				file: shim,
				description: `Remove ${removed.resource} controller shim`,
			});
		}
	}

	return instructions;
}

async function emitPluginLoader({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction | null> {
	const { input, context, output, reporter } = options;
	const { ir } = input;

	if (!ir) {
		reporter.warn(
			'createApplyPlanBuilder: IR artifact missing, skipping plugin loader emission.'
		);
		return null;
	}

	let existingPlugin: string | null = null;
	try {
		existingPlugin = await context.workspace.readText('plugin.php');
	} catch {
		existingPlugin = null;
	}

	if (
		existingPlugin &&
		!new RegExp(AUTO_GUARD_BEGIN, 'u').test(existingPlugin)
	) {
		reporter.info(
			'createApplyPlanBuilder: skipping plugin loader instruction because plugin.php appears user-owned.'
		);
		return null;
	}

	const resourceClassNames = ir.resources.map((resource) => {
		const pascal = toPascalCase(resource.name);
		return `${ir.php.namespace}\\Generated\\Rest\\${pascal}Controller`;
	});

	const program = buildPluginLoaderProgram({
		origin: ir.meta.origin,
		namespace: ir.php.namespace,
		sanitizedNamespace: ir.meta.sanitizedNamespace,
		resourceClassNames,
	});

	const incomingPath = path.posix.join(PLAN_INCOMING_ROOT, 'plugin.php');
	const basePath = path.posix.join(PLAN_BASE_ROOT, 'plugin.php');

	const { code } = await prettyPrinter.prettyPrint({
		filePath: context.workspace.resolve(incomingPath),
		program,
	});

	await context.workspace.write(incomingPath, code, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: code });

	const existingBase = await context.workspace.readText(basePath);
	if (existingBase === null) {
		const baseSnapshot = existingPlugin ?? code;
		await context.workspace.write(basePath, baseSnapshot, {
			ensureDir: true,
		});
		output.queueWrite({ file: basePath, contents: baseSnapshot });
	}

	reporter.debug('createApplyPlanBuilder: queued plugin loader instruction.');

	return {
		action: 'write',
		file: 'plugin.php',
		base: basePath,
		incoming: incomingPath,
		description: 'Update plugin loader',
	} satisfies PlanInstruction;
}

async function emitShim({
	options,
	prettyPrinter,
	resource,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	readonly resource: IRResource;
}): Promise<PlanInstruction | null> {
	const { input, context, output, reporter } = options;
	const { ir } = input;

	if (!ir) {
		reporter.warn(
			'createApplyPlanBuilder: IR artifact missing, skipping shim emission.',
			{ resource: resource.name }
		);
		return null;
	}

	const className = `${toPascalCase(resource.name)}Controller`;
	const generatedNamespaceRoot = `${ir.php.namespace}\\Generated`;
	const generatedClassFqn = `${generatedNamespaceRoot}\\Rest\\${className}`;

	const autoloadRoot = normaliseAutoloadPath(ir.php.autoload);
	const targetFile = path.posix.join(
		autoloadRoot,
		'Rest',
		`${className}.php`
	);
	const incomingPath = path.posix.join(PLAN_INCOMING_ROOT, targetFile);
	const basePath = path.posix.join(PLAN_BASE_ROOT, targetFile);

	const requireRelative = path.posix.relative(
		path.posix.dirname(targetFile),
		path.posix.join('.generated', 'php', 'Rest', `${className}.php`)
	);

	const program = buildShimProgram({
		ir,
		resource,
		className,
		generatedClassFqn,
		requirePath: formatRequirePath(requireRelative),
	});

	const { code } = await prettyPrinter.prettyPrint({
		filePath: context.workspace.resolve(incomingPath),
		program,
	});

	await context.workspace.write(incomingPath, code, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: code });

	const existingBase = await context.workspace.readText(basePath);
	if (existingBase === null) {
		await context.workspace.write(basePath, code, { ensureDir: true });
		output.queueWrite({ file: basePath, contents: code });
	}

	reporter.debug('createApplyPlanBuilder: queued shim instruction.', {
		resource: resource.name,
		file: targetFile,
	});

	return {
		action: 'write',
		file: targetFile,
		base: basePath,
		incoming: incomingPath,
		description: `Update ${resource.name} controller shim`,
	} satisfies PlanInstruction;
}

async function writePlan(
	options: BuilderApplyOptions,
	instructions: readonly PlanInstruction[]
): Promise<void> {
	const planContent = `${JSON.stringify({ instructions }, null, 2)}\n`;
	await options.context.workspace.write(PLAN_PATH, planContent, {
		ensureDir: true,
	});
	options.output.queueWrite({ file: PLAN_PATH, contents: planContent });
}

function normaliseAutoloadPath(value: string): string {
	if (!value) {
		return '';
	}

	const trimmed = value.replace(/\\/g, '/');
	const normalised = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
	return normalised.startsWith('./') ? normalised.slice(2) : normalised;
}

function formatRequirePath(relative: string): string {
	if (!relative) {
		return '/.generated/php';
	}

	const prefixed = relative.startsWith('.') ? relative : `./${relative}`;
	return prefixed.startsWith('/') ? prefixed : `/${prefixed}`;
}

function buildShimProgram(options: BuildShimOptions) {
	const { ir, resource, className, generatedClassFqn, requirePath } = options;

	const statements: PhpStmt[] = [];
	statements.push(
		buildDeclare([buildDeclareItem('strict_types', buildScalarInt(1))])
	);

	const namespaceStatements: PhpStmt[] = [];
	namespaceStatements.push(buildAutoGuardComment());
	namespaceStatements.push(
		buildIfStatement(
			buildBooleanNot(buildClassExistsCall(generatedClassFqn)),
			[
				buildExpressionStatement(
					buildFuncCall(buildName(['require_once']), [
						buildArg(buildRequireExpression(requirePath)),
					])
				),
			]
		)
	);

	namespaceStatements.push(
		buildClass(
			buildIdentifier(className),
			{
				extends: buildName(
					generatedClassFqn
						.split('\\')
						.filter((segment) => segment.length > 0)
				) as PhpName,
				stmts: [],
			},
			buildClassAttributes(ir, resource)
		)
	);

	const namespaceNode = buildNamespace(
		buildName(
			[ir.php.namespace, 'Rest'].join('\\').split('\\').filter(Boolean)
		) as PhpName,
		namespaceStatements
	);
	statements.push(namespaceNode);

	return statements;
}

function buildAutoGuardComment(): PhpStmt {
	return buildStmtNop({
		comments: [
			buildDocComment([
				'WP Kernel extension shim.',
				'Edits to this file will be preserved during apply operations.',
			]),
		],
	});
}

function buildClassExistsCall(fqn: string): PhpExpr {
	return buildFuncCall(buildName(['class_exists']), [
		buildArg(
			buildNode('Expr_ClassConstFetch', {
				class: buildName(
					fqn.split('\\').filter((segment) => segment.length > 0)
				),
				name: buildIdentifier('class'),
			})
		),
	]);
}

function buildRequireExpression(relative: string): PhpExpr {
	const dirConst = buildNode('Scalar_MagicConst_Dir', {}) as PhpExpr;
	const suffix = buildScalarString(
		relative.startsWith('/') ? relative : `/${relative}`
	);
	return buildBinaryOperation('Concat', dirConst, suffix);
}

function buildClassAttributes(ir: IRv1, resource: IRResource): PhpAttributes {
	return {
		comments: [
			buildDocComment([
				'AUTO-GENERATED by WP Kernel CLI.',
				`Source: ${ir.meta.origin} → resources.${resource.name}`,
				`Schema: ${resource.schemaKey} (${resource.schemaProvenance})`,
			]),
		],
	} satisfies PhpAttributes;
}

function buildIfStatement(cond: PhpExpr, stmts: PhpStmt[]): PhpStmt {
	return buildNode('Stmt_If', { cond, stmts, elseifs: [], else: null });
}

function buildExpressionStatement(expr: PhpExpr): PhpStmt {
	return buildNode('Stmt_Expression', { expr });
}
