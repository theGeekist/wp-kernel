# Actions

Actions are the conductors of your application. They orchestrate write operations, ensuring that every change to your data is consistent, predictable, and extensible. They are the central hub for all side effects, from API calls to cache invalidation.

## The Actions-First Philosophy

In a WPKernel application, UI components **never** modify data directly by calling a resource's `create` or `update` methods. Instead, they invoke an Action. The Action is responsible for coordinating all the work.

```mermaid
graph LR
    A[UI Event] --> B[Action]
    B --> C[API Call via Resource]
    B --> D[Cache Invalidation]
    B --> E[Event Emission]
    B --> F[Background Jobs]

    classDef blue fill:var(--vp-c-blue-soft),stroke:var(--vp-c-blue-1),color:var(--vp-c-text-1)
    classDef purple fill:var(--vp-c-purple-soft),stroke:var(--vp-c-purple-1),color:var(--vp-c-text-1)
    classDef green fill:var(--vp-c-green-soft),stroke:var(--vp-c-green-1),color:var(--vp-c-text-1)
    classDef red fill:var(--vp-c-red-soft),stroke:var(--vp-c-red-1),color:var(--vp-c-text-1)
    classDef yellow fill:var(--vp-c-yellow-soft),stroke:var(--vp-c-yellow-1),color:var(--vp-c-text-1)
    classDef gray fill:var(--vp-c-gray-soft-2),stroke:var(--vp-c-gray-2),color:var(--vp-c-text-1)

    class A blue
    class B purple
    class C green
    class D red
    class E yellow
    class F gray
```

This "actions-first" approach provides several key benefits:

- **Consistency**: All write operations follow the same, predictable lifecycle.
- **Reliability**: Side effects like cache invalidation and eventing are never forgotten.
- **Testability**: You can test your application's core logic independently of the UI.
- **Extensibility**: New functionality can be easily added to an action without changing the UI.

## Anatomy of an Action

Actions are defined programmatically using the `defineAction` function. They are the imperative counterpart to the declarative nature of resources in `wpk.config.ts`.

### 1. Basic Structure

An action is a function with a unique name and a `handler` that performs the work.

```typescript
import { defineAction } from '@wpkernel/core/actions';

export const CreatePost = defineAction({
	name: 'Post.Create',
	handler: async (
		ctx,
		{ title, content }: { title: string; content: string }
	) => {
		// Action logic goes here
	},
});
```

The first argument to the handler is the `ctx` (context) object, which provides access to resources, event emitters, and other core utilities.

### 2. Calling a Resource

The primary job of most actions is to call a resource's write method. This resource could be one generated from `wpk.config.ts` or one you've defined manually with `defineResource`.

```typescript
import { defineAction } from '@wpkernel/core/actions';
import { post } from '@/resources'; // Your resource object

export const CreatePost = defineAction({
	name: 'Post.Create',
	handler: async (ctx, { title, content }) => {
		// Call the resource to perform the API request
		const createdPost = await post.create({ title, content });
		return createdPost;
	},
});
```

### 3. Managing Side Effects

The `ctx` object is your toolkit for managing all the side effects related to a write operation.

```typescript
import { defineAction } from '@wpkernel/core/actions';
import { post } from '@/resources';
import { WPKernelError } from '@wpkernel/core/error';

export const CreatePost = defineAction({
	name: 'Post.Create',
	handler: async (ctx, { title, content, notifySubscribers = false }) => {
		// 1. Validate input
		if (!title?.trim()) {
			throw new WPKernelError('ValidationError', {
				message: 'Post title is required',
			});
		}

		// 2. Check permissions
		ctx.capability.assert('post.create');

		// 3. Call the resource
		const createdPost = await post.create({ title, content });

		// 4. Emit domain events
		ctx.emit('post.created', { postId: createdPost.id });

		// 5. Invalidate cache
		ctx.invalidate(post.cache.key('list'));

		// 6. Enqueue background jobs
		if (notifySubscribers) {
			await ctx.jobs.enqueue('SendPostNotification', {
				postId: createdPost.id,
			});
		}

		return createdPost;
	},
});
```

By centralizing this logic, you ensure that creating a post is always done the same way, whether it's triggered from a generated admin UI, a custom block, or a command-line script.

## Using Actions in Custom UIs

The `@wpkernel/ui` package provides the `useAction` hook to make calling actions from your custom React components simple and declarative.

```tsx
import { useAction } from '@wpkernel/ui';
import { CreatePost } from '@/actions/CreatePost';
import { Notice } from '@wordpress/components';

function PostForm() {
	const { run, status, error } = useAction(CreatePost);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

		await run({ title, content });
	};

	return (
		<form onSubmit={handleSubmit}>
			{/* ... form fields ... */}
			<button type="submit" disabled={status === 'running'}>
				{status === 'running' ? 'Creating...' : 'Create Post'}
			</button>
			{status === 'error' && (
				<Notice status="error" isDismissible={false}>
					{error?.message}
				</Notice>
			)}
		</form>
	);
}
```

The `useAction` hook provides the `run` function to trigger the action, as well as the current `status` of the request (`idle`, `running`, `success`, `error`) and any resulting `error`. This keeps your component clean and focused on presentation.

## What's Next?

- **[Events](/guide/events)**: Learn how actions and events work together to create a reactive system.
- **[UI Package](/packages/ui)**: Explore more UI hooks and components for building your own interfaces.
- **[Testing](/contributing/testing)**: See strategies for unit and integration testing your actions.
