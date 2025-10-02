/**
 * Unit tests for createEventHelper
 */

import type { Page } from '@playwright/test';
import { createEventHelper } from '../createKernelUtils.js';

describe('createEventHelper', () => {
	let mockPage: jest.Mocked<Page>;

	beforeEach(() => {
		mockPage = {
			evaluate: jest.fn(),
		} as unknown as jest.Mocked<Page>;
	});

	describe('initialization', () => {
		it('should initialize without pattern filter', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);

			await createEventHelper(mockPage);

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				undefined
			);
		});

		it('should initialize with pattern filter', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);
			const pattern = /^wpk\.job\./;

			await createEventHelper(mockPage, { pattern });

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				pattern.source
			);
		});

		it('should handle page.evaluate error during initialization', async () => {
			mockPage.evaluate.mockRejectedValue(
				new Error('window.wp.hooks not available')
			);

			await expect(createEventHelper(mockPage)).rejects.toThrow(
				'window.wp.hooks not available'
			);
		});
	});

	describe('list()', () => {
		it('should return all captured events', async () => {
			const mockEvents = [
				{
					type: 'wpk.job.created',
					payload: { id: 1 },
					timestamp: 1234567890,
				},
				{
					type: 'wpk.job.updated',
					payload: { id: 1 },
					timestamp: 1234567891,
				},
			];

			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockEvents);

			const recorder = await createEventHelper(mockPage);
			const events = await recorder.list();

			expect(events).toEqual(mockEvents);
		});

		it('should return empty array when no events captured', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce([]);

			const recorder = await createEventHelper(mockPage);
			const events = await recorder.list();

			expect(events).toEqual([]);
		});

		it('should handle undefined events array', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const recorder = await createEventHelper(mockPage);
			const events = await recorder.list();

			expect(events).toBeUndefined();
		});
	});

	describe('find()', () => {
		it('should find event by type', async () => {
			const mockEvent = {
				type: 'wpk.job.created',
				payload: { id: 1 },
				timestamp: 1234567890,
			};

			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockEvent);

			const recorder = await createEventHelper(mockPage);
			const event = await recorder.find('wpk.job.created');

			expect(event).toEqual(mockEvent);
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				2,
				expect.any(Function),
				'wpk.job.created'
			);
		});

		it('should return undefined when event not found', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const recorder = await createEventHelper(mockPage);
			const event = await recorder.find('wpk.job.deleted');

			expect(event).toBeUndefined();
		});
	});

	describe('findAll()', () => {
		it('should find all events of specific type', async () => {
			const mockEvents = [
				{
					type: 'wpk.job.created',
					payload: { id: 1 },
					timestamp: 1234567890,
				},
				{
					type: 'wpk.job.created',
					payload: { id: 2 },
					timestamp: 1234567891,
				},
			];

			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockEvents);

			const recorder = await createEventHelper(mockPage);
			const events = await recorder.findAll('wpk.job.created');

			expect(events).toEqual(mockEvents);
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				2,
				expect.any(Function),
				'wpk.job.created'
			);
		});

		it('should return empty array when no matching events', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce([]);

			const recorder = await createEventHelper(mockPage);
			const events = await recorder.findAll('wpk.job.deleted');

			expect(events).toEqual([]);
		});
	});

	describe('clear()', () => {
		it('should clear all captured events', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);

			const recorder = await createEventHelper(mockPage);
			await recorder.clear();

			expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				2,
				expect.any(Function)
			);
		});

		it('should handle page.evaluate error', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Clear failed'));

			const recorder = await createEventHelper(mockPage);

			await expect(recorder.clear()).rejects.toThrow('Clear failed');
		});
	});

	describe('stop()', () => {
		it('should stop event listener', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);

			const recorder = await createEventHelper(mockPage);
			await recorder.stop();

			expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
			expect(mockPage.evaluate).toHaveBeenNthCalledWith(
				2,
				expect.any(Function)
			);
		});

		it('should handle page.evaluate error', async () => {
			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('Stop failed'));

			const recorder = await createEventHelper(mockPage);

			await expect(recorder.stop()).rejects.toThrow('Stop failed');
		});
	});

	describe('type safety', () => {
		it('should infer payload type from generic parameter', async () => {
			interface JobPayload {
				id: number;
				title: string;
			}

			const mockEvent = {
				type: 'wpk.job.created',
				payload: { id: 1, title: 'Engineer' },
				timestamp: 1234567890,
			};

			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockEvent);

			const recorder = await createEventHelper<JobPayload>(mockPage);
			const event = await recorder.find('wpk.job.created');

			// TypeScript should enforce that payload has these properties
			expect(event?.payload).toEqual({ id: 1, title: 'Engineer' });
		});

		it('should type events list with payload type', async () => {
			interface JobPayload {
				id: number;
				title: string;
			}

			const mockEvents = [
				{
					type: 'wpk.job.created',
					payload: { id: 1, title: 'Engineer' },
					timestamp: 1234567890,
				},
			];

			mockPage.evaluate
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(mockEvents);

			const recorder = await createEventHelper<JobPayload>(mockPage);
			const events = await recorder.list();

			// TypeScript should enforce that events array has the typed payload
			expect(events).toEqual(mockEvents);
		});
	});

	describe('pattern filtering', () => {
		it('should create recorder with custom pattern', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);
			const pattern = /^wpk\.application\./;

			await createEventHelper(mockPage, { pattern });

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				pattern.source
			);
		});

		it('should create recorder with complex pattern', async () => {
			mockPage.evaluate.mockResolvedValue(undefined);
			const pattern = /^wpk\.(job|application)\.(created|updated)$/;

			await createEventHelper(mockPage, { pattern });

			expect(mockPage.evaluate).toHaveBeenCalledWith(
				expect.any(Function),
				pattern.source
			);
		});
	});
});
