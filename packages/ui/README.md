# @geekist/wp-kernel-ui

> WordPress-native UI components for modern admin interfaces and blocks

## Overview

React components built on `@wordpress/components` with kernel-aware functionality:

- **ActionButton** - Buttons that trigger actions (never transport directly)
- **DataViews integration** - Modern admin tables for WordPress 6.7+
- **ResourceForm** - Forms with validation and action submission
- **Block utilities** - Binding and Interactivity API helpers

Maintains WordPress design consistency while adding modern patterns.

## Quick Start

```bash
npm install @geekist/wp-kernel-ui @geekist/wp-kernel
```

```typescript
import { ActionButton, useResource } from '@geekist/wp-kernel-ui';
import { CreatePost } from '@/actions/CreatePost';
import { post } from '@/resources/post';

function PostDashboard() {
  const { data: posts, isLoading } = useResource(post);

  return (
    <div>
      <ActionButton action={CreatePost} variant="primary">
        Add New Post
      </ActionButton>

      {isLoading ? <Spinner /> : (
        <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
      )}
    </div>
  );
}
```

## Key Components

**📖 [Complete Documentation →](../../docs/packages/ui.md)**

### Admin Interfaces

```typescript
// DataViews for WordPress 6.7+
import { AdminTable } from '@geekist/wp-kernel-ui';
<AdminTable resource={user} fields={userFields} />

// Fallback for older WordPress
<FallbackTable resource={user} />
```

### Action Integration

```typescript
// Buttons that trigger actions
<ActionButton action={DeleteUser} variant="destructive">
  Delete User
</ActionButton>

// Forms with kernel actions
<ResourceForm
  resource={user}
  createAction={CreateUser}
  updateAction={UpdateUser}
/>
```

### WordPress Version Support

- **WordPress 6.5+** - Core components with graceful degradation
- **WordPress 6.7+** - Full DataViews and modern features
- **Feature detection** - Automatic fallbacks for compatibility

**🎨 [Implementation Patterns →](../../docs/packages/ui.md#admin-crud-patterns)**

- **[Getting Started](https://thegeekist.github.io/wp-kernel/getting-started/)** - Basic setup
- **[Component Reference](https://thegeekist.github.io/wp-kernel/api/ui-components/)** - Complete API docs

## Development Status

- ✅ Component architecture designed
- ✅ Core hooks implemented
- 🚧 Layout components in progress
- 🚧 Block components in progress

## Requirements

- WordPress 6.7+
- React 18+
- `@geekist/wp-kernel` installed
