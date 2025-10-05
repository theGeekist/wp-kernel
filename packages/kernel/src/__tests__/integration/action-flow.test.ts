/**
 * @file Integration test covering defineAction orchestration with resources.
 */

import { defineAction } from '../../actions/define';
import { defineResource } from '../../resource/define';
import * as cache from '../../resource/cache';

describe('Action Flow Integration', () => {
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;

	beforeEach(() => {
		mockApiFetch = jest.fn();
		mockDoAction = jest.fn();

		const windowWithWp = window as Window & {
			wp?: {
				data?: unknown;
				apiFetch?: jest.Mock;
				hooks?: { doAction: jest.Mock };
			};
		};

		const existingWp = windowWithWp.wp || {};
		(window as unknown as { wp?: unknown }).wp = {
			...existingWp,
			data: existingWp.data,
			apiFetch: mockApiFetch as unknown,
			hooks: { doAction: mockDoAction } as unknown,
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('executes resource create flow and emits canonical events', async () => {
		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);
		const invalidateSpy = jest
			.spyOn(cache, 'invalidate')
			.mockImplementation(() => undefined);

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const CreateThing = defineAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>('Thing.Create', async (ctx, { data }) => {
			const created = await resource.create!(data);
			const events = resource.events!;
			ctx.emit(events.created, { id: created.id, data: created });
			ctx.invalidate(['thing', 'list']);
			return created;
		});

		const result = await CreateThing({ data: { title: 'Created' } });

		expect(result).toEqual(createdThing);
		expect(mockApiFetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'POST',
			data: { title: 'Created' },
			parse: true,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Thing.Create' })
		);
		const events = resource.events!;
		expect(mockDoAction).toHaveBeenCalledWith(events.created, {
			id: createdThing.id,
			data: createdThing,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({
				actionName: 'Thing.Create',
				result: createdThing,
			})
		);
		expect(invalidateSpy).toHaveBeenCalledWith(
			['thing', 'list'],
			undefined
		);

		invalidateSpy.mockRestore();
	});
});
