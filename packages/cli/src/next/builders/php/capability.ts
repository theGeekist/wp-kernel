import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import { buildCapabilityModule } from '@wpkernel/wp-json-ast';
import type { CapabilityModuleWarning } from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';

export function createPhpCapabilityHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.capability',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;

			const namespace = `${ir.php.namespace}\\Generated\\Capability`;
			const module = buildCapabilityModule({
				origin: ir.meta.origin,
				namespace,
				capabilityMap: ir.capabilityMap,
				hooks: {
					onWarning: (warning) =>
						forwardCapabilityWarning(options.reporter, warning),
				},
			});

			const channel = getPhpBuilderChannel(options.context);
			for (const file of module.files) {
				const filePath = options.context.workspace.resolve(
					ir.php.outputDir,
					file.fileName
				);

				channel.queue({
					file: filePath,
					program: file.program,
					metadata: file.metadata,
					docblock: file.docblock,
					uses: file.uses,
					statements: file.statements,
				});
			}

			await next?.();
		},
	});
}

function forwardCapabilityWarning(
	reporter: BuilderApplyOptions['reporter'],
	warning: CapabilityModuleWarning
): void {
	switch (warning.kind) {
		case 'capability-map-warning': {
			reporter.warn('Capability helper warning emitted.', {
				code: warning.warning.code,
				message: warning.warning.message,
				context: warning.warning.context,
			});
			break;
		}
		case 'capability-definition-missing': {
			reporter.warn('Capability falling back to default capability.', {
				// canonical
				capability: warning.capability,
				fallbackCapability: warning.fallbackCapability,
				scope: warning.fallbackScope,
				// legacy compatibility: tests/tools expecting an array alias
				capabilities: [warning.fallbackCapability],
			});
			break;
		}
		case 'capability-definition-unused': {
			reporter.warn('Capability definition declared but unused.', {
				capability: warning.capability,
				scope: warning.scope,
			});
			break;
		}
		default:
			throw new TypeError('Unhandled capability warning kind.');
	}
}
