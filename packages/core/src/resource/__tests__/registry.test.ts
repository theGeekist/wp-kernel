import { assignResourceNames } from '../registry';

describe('assignResourceNames', () => {
	it('derives names from registry keys when omitted', () => {
		const registry = assignResourceNames({
			job: {
				routes: { list: { path: '/jobs', method: 'GET' } },
				storage: { mode: 'transient' },
			},
		});

		expect(registry.job.name).toBe('job');
	});

	it('preserves explicit names', () => {
		const registry = assignResourceNames({
			task: {
				name: 'custom-task',
				routes: { list: { path: '/tasks', method: 'GET' } },
				storage: { mode: 'transient' },
			},
		});

		expect(registry.task.name).toBe('custom-task');
	});

	it('throws when entry is not an object', () => {
		expect(() =>
			assignResourceNames({
				broken: null as unknown as Record<string, never>,
			})
		).toThrowErrorMatchingInlineSnapshot(
			`"Resource \"broken\" must be configured with an object."`
		);
	});
});
