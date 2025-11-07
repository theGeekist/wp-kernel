Based on verified analysis of the codebase, here is a detailed explanation of what is generated on the JS/TS side, how it interacts with the `@wpkernel/` packages, and what the developer's workflow looks like.

### Executive Summary: What is Generated?

On the JavaScript/TypeScript side, the generator creates **TypeScript type definitions and opt-in UI components** when configured. The generation is **always opt-in** for UI elements.

Specifically, the following files are generated:

1. **TypeScript Types (Always):** `.generated/types/{resource}.d.ts` - Type definitions derived from your resource's JSON schema. These provide type safety for your resource data throughout your codebase.

2. **Admin Screen Component (Opt-in):** For each resource in your `wpk.config.ts` that has a `ui.admin.dataviews` section configured, a fully functional React component (`.generated/ui/app/{resource}/admin/{Resource}AdminScreen.tsx`) is generated. This renders a complete data management screen for your resource.

**Note:** The generator does **not** create resource definition files. Developers manually create `src/resources/{resource}.ts` files using `defineResource()` with the configuration from `wpk.config.ts`.

Let's break down the details.

### 1. The Generated Admin Screen: Your JavaScript Bootstrap

This is generated **only when you configure `ui.admin.dataviews` for a resource**. For a resource named `book`, a file like `.generated/ui/app/book/admin/BookAdminScreen.tsx` is created.

This file is **not empty boilerplate**. It's a complete, working React component that:

- **Imports Core Primitives:** It automatically adds the necessary `import` statements from the `@wpkernel/` packages. It doesn't _re-generate_ these primitives; it _consumes_ them.
- **Connects to the UI Runtime:** It retrieves the central UI runtime from your wpk instance via `kernel.getUIRuntime()`.
- **Renders the `ResourceDataView`:** It uses the powerful, pre-built `ResourceDataView` component from `@wpkernel/ui` to render the entire UI for your resource (the table, filters, pagination, create/edit buttons, etc.).
- **Passes Configuration:** It wires up the `ResourceDataView` component with the specific resource definition (imported from your manually-created `src/resources/{resource}.ts`) and configuration from your `wpk.config.ts`.

Here is a verified example of the generated `BookAdminScreen.tsx` based on the actual builder implementation in `packages/cli/src/builders/ts.ts` (lines 273-428):

```tsx
/** @jsxImportSource @wordpress/element */

// 1. Imports from @wpkernel packages (The "Primitives")
import { WPKernelUIProvider, useWPKernelUI } from '@wpkernel/ui';
import { ResourceDataView } from '@wpkernel/ui';
import { WPKernelError } from '@wpkernel/core/contracts';

// 2. Imports your wpk instance and manually-created resource definition
import { wpk } from '../../../../../../../app'; // Path to your configureWPKernel() instance
import { book } from '../../../../../../../resources/book'; // Path to your defineResource() call

// 3. A generated "Content" component to encapsulate the view
function BookAdminScreenContent() {
	const runtime = useWPKernelUI();
	return (
		<ResourceDataView
			resource={book}
			config={book.config.ui?.admin?.dataviews}
			runtime={runtime}
		/>
	);
}

// 4. The main exported component (The "Bootstrap")
export function BookAdminScreen() {
	const runtime = kernel.getUIRuntime?.();
	if (!runtime) {
		throw new WPKernelError(
			'UI runtime not available. Ensure configureWPKernel was called with UI configuration.',
			{ code: 'RUNTIME_MISSING' }
		);
	}

	return (
		<WPKernelUIProvider runtime={runtime}>
			<BookAdminScreenContent />
		</WPKernelUIProvider>
	);
}
```

### 2. What About Resource Definitions?

**Important:** The generator does **not** create resource definition files for you. This is a manual step that is part of the developer workflow.

You must manually create `src/resources/book.ts` like this:

```typescript
import { defineResource } from '@wpkernel/core/resource';
import { wpkConfig } from '../wpk.config';

export const book = defineResource(wpkConfig.resources.book);
```

The `defineResource()` function takes your resource configuration from `wpk.config.ts` and returns a resource instance with:

- Client-side API methods (`.list()`, `.get()`, `.create()`, `.update()`, `.delete()`)
- Cache key management
- Event emission
- Type safety via the generated `.d.ts` file

### 3. Developer Workflow and Picking Primitives

This is the key to understanding the workflow. The answer is **both no and yes.**

- **No, not for the basics:** The developer is **not** expected to manually wire up this initial screen. The generator does the "picking and choosing" for them, selecting the essential primitives (`WPKernelUIProvider`, `ResourceDataView`, etc.) to provide a working data management screen out of the box. This is the "convention over configuration" principle at work.
- **Yes, for customization and extension:** The generated file is a **starting point**. The developer is absolutely expected to edit this file and import other primitives from `@wpkernel/ui` and `@wpkernel/core` to build custom functionality.

#### Developer Workflow Example:

1. **Define a `book` resource** in `wpk.config.ts` with schema, routes, and optionally `ui.admin.dataviews` configuration.
2. **Run `wpk generate`**:
    - `.generated/types/book.d.ts` is created (always)
    - `.generated/ui/app/book/admin/BookAdminScreen.tsx` is created (only if `ui.admin.dataviews` is configured)
3. **Manually create `src/resources/book.ts`** using `defineResource(wpkConfig.resources.book)`.
4. **Register the generated component** with WordPress. You now have a working "Books" admin screen that can list, create, edit, and delete books, with all API calls and state management handled automatically by the `ResourceDataView`.
5. **Customization:** Now, let's say you want to add a custom button to this screen that exports all books to a CSV file. You would:
    - **Edit `.generated/ui/app/book/admin/BookAdminScreen.tsx`** (the generated file is your starting point).
    - **Import additional primitives:** `import { Button } from '@wpkernel/ui/components';`
    - **Use resource methods:** Call `book.list()` from your manually-created resource definition.
    - **Add the button** to the component's JSX and write the `onClick` handler to perform the export logic.

### Conclusion

The JavaScript/TypeScript generation strategy is designed for **developer velocity** with clear separation of concerns:

1. **Type Definitions (Always Generated):** Provide type safety for your resource data across your entire codebase.

2. **Admin Screens (Opt-in Generated):** When you configure `ui.admin.dataviews`, you get a fully-functional, opinionated **bootstrap** that correctly uses the core primitives from the `@wpkernel/` packages.

3. **Resource Definitions (Manual):** You create `src/resources/{resource}.ts` files using `defineResource()` to instantiate your resources with client-side methods.

The developer's job is not to build the foundation but to **build upon it**. They start with:

- Generated type definitions for data validation
- A working admin screen (if configured)
- Manually-created resource instances for API interaction

Then they "pick and choose" additional components and utilities from `@wpkernel/ui` and `@wpkernel/core` to add the specific custom features their plugin requires. The generated files are fully editable starting points, not black-box abstractions.
