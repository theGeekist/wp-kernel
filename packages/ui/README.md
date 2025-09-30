# @geekist/wp-kernel-ui

> Reusable UI components for WP Kernel

## Overview

A collection of WordPress-native UI components built on `@wordpress/components` that follow WP Kernel patterns and conventions.

## Installation

```bash
npm install @geekist/wp-kernel-ui @geekist/wp-kernel
# or
pnpm add @geekist/wp-kernel-ui @geekist/wp-kernel
```

## Peer Dependencies

This package requires:

- `@geekist/wp-kernel` (the core framework)
- `@wordpress/components` (WordPress component library)
- `@wordpress/element` (WordPress React wrapper)
- `react` (React 18+)

## Components (Coming Soon)

This package will include:

### Layout Components

- `ActionButton` - Button that triggers WP Kernel actions
- `ResourceList` - Data-driven list with automatic loading states
- `ResourceForm` - Form with validation and action submission
- `NoticeContainer` - Global notices using core/notices

### Data Components

- `ResourceProvider` - Context provider for resource data
- `useResource` - Hook for accessing resource state
- `useAction` - Hook for triggering actions

### Block Components

- `BindingPreview` - Preview block bindings in editor
- `InteractivityProvider` - Wrap blocks with interactivity context

## Usage Example

```typescript
import { ActionButton, useResource } from '@geekist/wp-kernel-ui';
import { CreatePost } from './actions/Post/Create';
import { post } from './resources/post';

const PostList = () => {
	const { data: posts, loading } = useResource(post, 'list');

	return (
		<div>
			{loading && <Spinner />}
			{posts?.map((p) => (
				<div key={p.id}>{p.title}</div>
			))}
			<ActionButton
				action={CreatePost}
				actionArgs={{ data: { title: 'New Post' } }}
			>
				Create Post
			</ActionButton>
		</div>
	);
};
```

## Design Principles

1. **WordPress-Native** - Uses `@wordpress/components` exclusively
2. **Action-Aware** - Components understand WP Kernel actions
3. **Type-Safe** - Full TypeScript support with generics
4. **Accessible** - Follows WordPress accessibility guidelines
5. **Minimal** - Thin wrappers, not a reinvention

## Documentation

For complete documentation, see the [main repository](https://github.com/theGeekist/wp-kernel).

## License

MIT © [The Geekist](https://github.com/theGeekist)
