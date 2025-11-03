/**
 * Capability Denied Error tests
 */

import { CapabilityDeniedError } from '../CapabilityDeniedError';

describe('CapabilityDeniedError', () => {
	it('creates error with correct properties', () => {
		const error = new CapabilityDeniedError({
			namespace: 'my-plugin',
			capabilityKey: 'posts.edit',
			params: { postId: 123 },
		});

		expect(error).toBeInstanceOf(CapabilityDeniedError);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('CapabilityDeniedError');
		expect(error.code).toBe('CapabilityDenied');
		expect(error.capabilityKey).toBe('posts.edit');
		expect(error.namespace).toBe('my-plugin');
		expect(error.messageKey).toBe('capability.denied.my-plugin.posts.edit');
		expect(error.message).toBe('Capability "posts.edit" denied.');
	});

	it('includes params in context for object params', () => {
		const error = new CapabilityDeniedError({
			namespace: 'acme',
			capabilityKey: 'content.delete',
			params: { contentId: 456, reason: 'insufficient-permissions' },
		});

		expect(error.context).toEqual({
			capabilityKey: 'content.delete',
			contentId: 456,
			reason: 'insufficient-permissions',
		});
	});

	it('wraps primitive params in value property', () => {
		const error = new CapabilityDeniedError({
			namespace: 'acme',
			capabilityKey: 'tasks.assign',
			params: 'user-123',
		});

		expect(error.context).toEqual({
			capabilityKey: 'tasks.assign',
			value: 'user-123',
		});
	});

	it('handles undefined params', () => {
		const error = new CapabilityDeniedError({
			namespace: 'acme',
			capabilityKey: 'admin.access',
		});

		expect(error.context).toEqual({
			capabilityKey: 'admin.access',
		});
	});

	it('accepts custom error message', () => {
		const error = new CapabilityDeniedError({
			namespace: 'acme',
			capabilityKey: 'posts.publish',
			message: 'Custom denial message',
		});

		expect(error.message).toBe('Custom denial message');
		expect(error.messageKey).toBe('capability.denied.acme.posts.publish');
	});

	it('merges additional context', () => {
		const error = new CapabilityDeniedError({
			namespace: 'acme',
			capabilityKey: 'workflow.approve',
			params: { workflowId: 789 },
			context: { timestamp: 1234567890, userRole: 'editor' },
		});

		expect(error.context).toEqual({
			capabilityKey: 'workflow.approve',
			workflowId: 789,
			timestamp: 1234567890,
			userRole: 'editor',
		});
	});

	it('instanceof checks work correctly', () => {
		const error = new CapabilityDeniedError({
			namespace: 'test',
			capabilityKey: 'test.action',
		});

		expect(error instanceof CapabilityDeniedError).toBe(true);
		expect(error instanceof Error).toBe(true);
	});
});
