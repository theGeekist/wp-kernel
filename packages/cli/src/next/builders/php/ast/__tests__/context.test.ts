import type { PipelineContext } from '../../../../runtime/types';
import { getPhpAstChannel, resetPhpAstChannel } from '../context';
import type { PhpFileMetadata } from '../types';

describe('PhpAstChannel', () => {
	function createContext(): PipelineContext {
		return {} as PipelineContext;
	}

	it('memoises the channel on the pipeline context', () => {
		const context = createContext();

		const first = getPhpAstChannel(context);
		const second = getPhpAstChannel(context);

		expect(second).toBe(first);
	});

	it('reuses open entries and clears them on reset', () => {
		const context = createContext();
		const channel = getPhpAstChannel(context);

		const metadata: PhpFileMetadata = { kind: 'policy-helper' };

		const entry = channel.open({
			key: 'demo',
			filePath: 'demo.php',
			namespace: 'Demo\\Plugin',
			metadata,
		});

		expect(entry.context.namespaceParts).toEqual(['Demo', 'Plugin']);
		entry.context.docblockLines.push('@internal demo');

		const reopened = channel.open({
			key: 'demo',
			filePath: 'demo.php',
			namespace: 'Demo\\Plugin',
			metadata,
		});

		expect(reopened).toBe(entry);
		expect(reopened.context.docblockLines).toContain('@internal demo');
		expect(channel.entries()).toHaveLength(1);

		resetPhpAstChannel(context);

		expect(channel.entries()).toHaveLength(0);
	});
});
