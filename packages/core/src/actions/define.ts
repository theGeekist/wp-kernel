/**
 * Actions orchestration — defineAction implementation
 *
 * Actions are the conductors of your WordPress application. They orchestrate
 * write operations with consistent side effects: event emission, cache invalidation,
 * job scheduling, and policy enforcement.
 *
 * @module @wpkernel/core/actions/define
 */

import { KernelError } from '../error/KernelError';
import {
	createActionContext,
	emitLifecycleEvent,
	generateActionRequestId,
	resolveOptions,
} from './context';
import type {
	ActionConfig,
	ActionLifecycleEvent,
	DefinedAction,
	ResolvedActionOptions,
} from './types';
import { getKernelEventBus, recordActionDefined } from '../events/bus';
import { getNamespace } from '../namespace/detect';

/**
 * Normalize unknown errors into structured KernelError instances.
 *
 * Ensures all errors thrown from actions follow a consistent shape for logging,
 * debugging, and error handling. Preserves stack traces and merges action context.
 *
 * @param error      - Unknown error value caught during action execution
 * @param actionName - Name of the action that threw the error
 * @param requestId  - Correlation ID for tracking this action invocation
 * @return Normalized KernelError with action context attached
 * @internal
 */
function normalizeError(
	error: unknown,
	actionName: string,
	requestId: string
): KernelError {
	if (KernelError.isKernelError(error)) {
		const context = {
			...(error.context || {}),
			actionName: error.context?.actionName ?? actionName,
			requestId: error.context?.requestId ?? requestId,
		};
		const wrapped = new KernelError(error.code, {
			message: error.message,
			data: error.data,
			context,
		});
		wrapped.stack = error.stack;
		return wrapped;
	}

	if (error instanceof Error) {
		return KernelError.wrap(error, 'UnknownError', {
			actionName,
			requestId,
		});
	}

	return new KernelError('UnknownError', {
		message: `Action \"${actionName}\" failed with non-error value`,
		data: { value: error },
		context: { actionName, requestId },
	});
}

/**
 * Build lifecycle event payload for emission.
 *
 * Creates structured event objects for action start, completion, and error phases.
 * These events power the observability layer and enable debugging, monitoring,
 * and cross-component coordination.
 *
 * @param phase      - Lifecycle phase: 'start', 'complete', or 'error'
 * @param options    - Resolved action options (scope, bridged)
 * @param actionName - Name of the action being executed
 * @param requestId  - Correlation ID for this invocation
 * @param namespace  - Resolved namespace for event naming
 * @param extra      - Phase-specific payload (args, result, error, duration)
 * @return Structured lifecycle event ready for emission
 * @internal
 */
function createLifecycleEvent(
	phase: ActionLifecycleEvent['phase'],
	options: ResolvedActionOptions,
	actionName: string,
	requestId: string,
	namespace: string,
	extra: Partial<{
		args: unknown;
		result: unknown;
		durationMs: number;
		error: unknown;
	}>
): ActionLifecycleEvent {
	const base = {
		actionName,
		requestId,
		namespace,
		scope: options.scope,
		bridged: options.bridged,
		timestamp: Date.now(),
	} as const;

	if (phase === 'start') {
		return {
			phase,
			...base,
			args: extra.args ?? null,
		};
	}

	if (phase === 'complete') {
		return {
			phase,
			...base,
			result: extra.result,
			durationMs: extra.durationMs ?? 0,
		};
	}

	return {
		phase: 'error',
		...base,
		error: extra.error,
		durationMs: extra.durationMs ?? 0,
	};
}

/**
 * Define a WP Kernel action with lifecycle instrumentation and side-effect coordination.
 *
 * Actions are the conductors of your WordPress application—they orchestrate every write
 * operation with consistent, predictable side effects. This is the foundation of the
 * **Actions-First Philosophy**: UI components never call resource write methods directly;
 * they always route through actions.
 *
 * ## What Actions Do
 *
 * Every action execution automatically handles:
 * - **Resource calls** — Perform the actual write operation via REST API
 * - **Event emission** — Broadcast lifecycle events via `@wordpress/hooks` and BroadcastChannel
 * - **Cache invalidation** — Keep UI fresh without manual work
 * - **Job scheduling** — Queue background tasks without blocking users
 * - **Policy enforcement** — Check capabilities before writes
 * - **Error normalization** — Convert any error into structured `KernelError`
 * - **Observability** — Emit start/complete/error events for monitoring
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { defineAction } from '@wpkernel/core/actions';
 * import { testimonial } from '@/resources/testimonial';
 *
 * export const CreateTestimonial = defineAction<
 *   { data: Testimonial },
 *   Testimonial
 * >('Testimonial.Create', async (ctx, { data }) => {
 *   // 1. Policy check
 *   ctx.policy.assert('testimonials.create');
 *
 *   // 2. Resource call (the actual write)
 *   const created = await testimonial.create!(data);
 *
 *   // 3. Emit canonical event
 *   ctx.emit(testimonial.events.created, { id: created.id, data: created });
 *
 *   // 4. Invalidate cache
 *   ctx.invalidate(['testimonial', 'list']);
 *
 *   // 5. Queue background job
 *   await ctx.jobs.enqueue('IndexTestimonial', { id: created.id });
 *
 *   return created;
 * });
 *
 * // Use in UI
 * await CreateTestimonial({ data: { title: 'Great!', rating: 5 } });
 * ```
 *
 * ## Lifecycle Events
 *
 * Each invocation automatically emits three lifecycle hooks via `@wordpress/hooks`:
 *
 * - **`wpk.action.start`** — Before execution, includes args and metadata
 * - **`wpk.action.complete`** — After success, includes result and duration
 * - **`wpk.action.error`** — On failure, includes normalized `KernelError` and duration
 *
 * These events enable:
 * - Debugging (see exactly what actions ran and when)
 * - Analytics (track action performance)
 * - Cross-component coordination (react to writes elsewhere)
 * - Audit trails (who did what, when)
 *
 * ## Event Scope
 *
 * By default, actions are **cross-tab** — events broadcast to all open tabs via BroadcastChannel:
 *
 * ```typescript
 * // Default: events visible in all tabs
 * defineAction('Post.Create', async (ctx, args) => { ... });
 *
 * // Explicit cross-tab
 * defineAction('Post.Create', async (ctx, args) => { ... }, { scope: 'crossTab' });
 *
 * // Tab-local: events stay in current tab only
 * defineAction('UI.ToggleSidebar', async (ctx, args) => { ... }, { scope: 'tabLocal' });
 * ```
 *
 * **Important**: Tab-local actions (`scope: 'tabLocal'`) **never bridge to PHP** even
 * if `bridged: true` is provided. This ensures UI-only actions don't leak to the server.
 *
 * ## PHP Bridge
 *
 * Set `bridged: true` (default for cross-tab) to forward events to PHP via REST:
 *
 * ```typescript
 * // Events bridge to PHP (default)
 * defineAction('Post.Publish', async (ctx, args) => { ... });
 *
 * // Disable PHP bridge
 * defineAction('Post.Draft', async (ctx, args) => { ... }, { bridged: false });
 * ```
 *
 * ## Context Surface
 *
 * The `ActionContext` (first parameter `ctx`) provides:
 *
 * - **`ctx.requestId`** — Unique correlation ID for this invocation
 * - **`ctx.namespace`** — Auto-detected namespace for event naming
 * - **`ctx.emit(eventName, payload)`** — Emit canonical events
 * - **`ctx.invalidate(patterns, options?)`** — Invalidate resource caches
 * - **`ctx.jobs.enqueue(name, payload)`** — Queue background jobs
 * - **`ctx.jobs.wait(name, payload, opts?)`** — Wait for job completion
 * - **`ctx.policy.assert(capability)`** — Throw if capability missing
 * - **`ctx.policy.can(capability)`** — Check capability (returns boolean)
 * - **`ctx.reporter.info/warn/error/debug(msg, ctx?)`** — Structured logging
 *
 * ## Error Handling
 *
 * All errors are automatically normalized to `KernelError` instances with:
 * - Consistent error codes
 * - Action name and request ID in context
 * - Preserved stack traces
 * - Structured error data
 *
 * ```typescript
 * defineAction('TestAction', async (ctx, args) => {
 *   throw new Error('Something broke');  // Auto-wrapped as KernelError
 * });
 * ```
 *
 * ## Redux Integration
 *
 * Actions integrate with Redux/`@wordpress/data` stores via middleware:
 *
 * ```typescript
 * import { createActionMiddleware, invokeAction } from '@wpkernel/core/actions';
 *
 * const middleware = createActionMiddleware();
 * const store = createReduxStore('my/store', reducers, [middleware]);
 *
 * // Dispatch returns the action promise
 * await store.dispatch(invokeAction(CreateTestimonial, { data }));
 * ```
 *
 * ## Runtime Configuration
 *
 * Host applications can customize behavior via `global.__WP_KERNEL_ACTION_RUNTIME__`:
 *
 * ```typescript
 * global.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   reporter: customLogger,
 *   jobs: customJobRunner,
 *   policy: customPolicyEngine,
 *   bridge: customPHPBridge,
 * };
 * ```
 *
 * Without configuration, actions fall back to console logging and throw
 * `NotImplementedError` when job helpers are invoked.
 *
 * @template TArgs - Type of arguments passed to the action
 * @template TResult - Type of value returned by the action
 * @param    config                 - Configuration describing the action
 * @param    config.name            - Unique action identifier (e.g., 'Post.Create', 'User.Login')
 * @param    config.handler         - Implementation receiving the context and args
 * @param    config.options         - Optional event scope and bridging configuration
 * @param    config.options.scope   - Event visibility: 'crossTab' (default) or 'tabLocal'
 * @param    config.options.bridged - Whether to forward events to PHP (default: true for crossTab)
 * @return Callable action function with metadata attached
 * @throws DeveloperError if actionName is invalid or fn is not a function
 *
 * @example
 * // Basic action
 * export const CreatePost = defineAction(
 *   'Post.Create',
 *   async (ctx, { title, content }) => {
 *     const post = await postResource.create!({ title, content });
 *     ctx.invalidate(['post', 'list']);
 *     return post;
 *   }
 * );
 *
 * @example
 * // With full orchestration
 * export const PublishPost = defineAction(
 *   'Post.Publish',
 *   async (ctx, { id }) => {
 *     ctx.policy.assert('posts.publish');
 *     const post = await postResource.update!({ id, status: 'publish' });
 *     ctx.emit(postResource.events.updated, { id, data: post });
 *     ctx.invalidate(['post', 'list'], { storeKey: 'my-plugin/post' });
 *     await ctx.jobs.enqueue('SendPublishNotifications', { postId: id });
 *     ctx.reporter.info('Post published', { postId: id });
 *     return post;
 *   }
 * );
 *
 * @example
 * // Tab-local UI action
 * export const ToggleSidebar = defineAction({
 *   name: 'UI.ToggleSidebar',
 *   handler: async (ctx, { isOpen }) => {
 *     // Events stay in this tab only
 *     ctx.emit('ui.sidebar.toggled', { isOpen });
 *     return { isOpen };
 *   },
 *   options: { scope: 'tabLocal' }
 * });
 *
 * @see ActionContext interface for the full context API surface
 * @see middleware module for Redux integration
 * @public
 */
export function defineAction<TArgs = void, TResult = void>(
	config: ActionConfig<TArgs, TResult>
): DefinedAction<TArgs, TResult> {
	if (!config || typeof config !== 'object') {
		throw new KernelError('DeveloperError', {
			message:
				'defineAction requires a configuration object with "name" and "handler".',
		});
	}

	const { name, handler, options = {} } = config;

	if (!name || typeof name !== 'string') {
		throw new KernelError('DeveloperError', {
			message:
				'defineAction requires a non-empty string "name" property.',
		});
	}

	if (typeof handler !== 'function') {
		throw new KernelError('DeveloperError', {
			message: `defineAction(\"${name}\") expects a function for the "handler" property.`,
		});
	}

	const resolvedOptions = resolveOptions(options);

	const action = async function executeAction(args: TArgs): Promise<TResult> {
		const requestId = generateActionRequestId();
		const context = createActionContext(name, requestId, resolvedOptions);
		const startEvent = createLifecycleEvent(
			'start',
			resolvedOptions,
			name,
			requestId,
			context.namespace,
			{ args }
		);
		emitLifecycleEvent(startEvent);
		const startTime = performance.now();

		try {
			const result = await handler(context, args);
			const duration = performance.now() - startTime;
			const completeEvent = createLifecycleEvent(
				'complete',
				resolvedOptions,
				name,
				requestId,
				context.namespace,
				{ result, durationMs: duration }
			);
			emitLifecycleEvent(completeEvent);
			return result;
		} catch (error) {
			const kernelError = normalizeError(error, name, requestId);
			const duration = performance.now() - startTime;
			const errorEvent = createLifecycleEvent(
				'error',
				resolvedOptions,
				name,
				requestId,
				context.namespace,
				{ error: kernelError, durationMs: duration }
			);
			emitLifecycleEvent(errorEvent);
			throw kernelError;
		}
	} as DefinedAction<TArgs, TResult>;

	Object.defineProperty(action, 'actionName', {
		value: name,
		enumerable: true,
		writable: false,
	});

	Object.defineProperty(action, 'options', {
		value: resolvedOptions,
		enumerable: true,
		writable: false,
	});

	const namespace = getNamespace();
	const definition = {
		action: action as DefinedAction<unknown, unknown>,
		namespace,
	};
	recordActionDefined(definition);
	getKernelEventBus().emit('action:defined', definition);

	return action;
}
