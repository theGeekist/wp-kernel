import { buildPipelineCommit, buildPipelineRollback } from '../commit';

describe('pipeline commit helpers', () => {
	it('returns undefined when no tasks are provided', () => {
		expect(buildPipelineCommit()).toBeUndefined();
		expect(buildPipelineRollback()).toBeUndefined();
	});

	it('executes commit tasks sequentially', async () => {
		const order: string[] = [];
		const commit = buildPipelineCommit(
			() => {
				order.push('first');
			},
			() => {
				order.push('second');
			}
		)!;

		await commit();
		expect(order).toEqual(['first', 'second']);
	});

	it('executes rollback tasks in reverse order', async () => {
		const order: string[] = [];
		const rollback = buildPipelineRollback(
			() => {
				order.push('first');
			},
			() => {
				order.push('second');
			}
		)!;

		await rollback();
		expect(order).toEqual(['second', 'first']);
	});

	it('awaits asynchronous tasks before advancing', async () => {
		const order: string[] = [];
		const commit = buildPipelineCommit(
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				order.push('async');
			},
			() => {
				order.push('sync');
			}
		)!;

		await commit();
		expect(order).toEqual(['async', 'sync']);
	});
});
