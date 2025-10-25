import { createHelper } from '../../runtime';
import { KernelError } from '@wpkernel/core/error';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	createPhpBaseControllerHelper,
	createPhpChannelHelper,
	createPhpIndexFileHelper,
	createPhpPersistenceRegistryHelper,
	createPhpPolicyHelper,
	createPhpProgramWriterHelper,
	createPhpResourceControllerHelper,
} from './printers';

export type CreatePhpBuilderOptions = Record<string, never>;

export function createPhpBuilder(
	_options: CreatePhpBuilderOptions = {}
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.core',
		kind: 'builder',
		dependsOn: ['builder.generate.php.driver'],
		async apply(applyOptions: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = applyOptions;
			if (input.phase !== 'generate') {
				reporter.debug('createPhpBuilder: skipping phase.', {
					phase: input.phase,
				});
				await next?.();
				return;
			}

			const helperPipeline = [
				createPhpChannelHelper(),
				createPhpBaseControllerHelper(),
				createPhpResourceControllerHelper(),
				createPhpPolicyHelper(),
				createPhpPersistenceRegistryHelper(),
				createPhpIndexFileHelper(),
				createPhpProgramWriterHelper(),
			];

			if (!input.ir) {
				throw new KernelError('ValidationError', {
					message:
						'createPhpBuilder requires an IR instance during execution.',
				});
			}

			await runHelperSequence(helperPipeline, applyOptions);
			reporter.info('createPhpBuilder: PHP artifacts generated.');
			await next?.();
		},
	});
}

type PhpBuilderApplyOptions = BuilderApplyOptions;

async function runHelperSequence(
	helpers: readonly BuilderHelper[],
	options: PhpBuilderApplyOptions
): Promise<void> {
	const invoke = async (index: number): Promise<void> => {
		const helper = helpers[index];
		if (!helper) {
			return;
		}

		await helper.apply(options, async () => {
			await invoke(index + 1);
		});
	};

	await invoke(0);
}
