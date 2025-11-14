# DataViews

WPKernel integrates deeply with the `@wordpress/dataviews` package to create powerful, production-ready admin screens directly from your `wpk.config.ts` file. Instead of manually composing components, you declare the shape of your admin UI, and the WPKernel CLI generates the complete, interactive screen for you.

## The "Config-First" Admin Screen

The primary way to create a DataView in WPKernel is by adding a `ui.admin.dataviews` block to a resource in your `wpk.config.ts`.

```ts
// In wpk.config.ts
resources: {
  job: {
    name: 'job',
    // ... other resource config
    ui: {
      admin: {
        view: 'dataviews',
        dataviews: {
          // Fields to display in the table
          fields: [ 'title', 'status', 'location', 'created_at' ],
          // Actions available for each row or in bulk
          actions: [
            { id: 'jobs.edit', action: 'Job.Edit' },
            { id: 'jobs.publish', action: 'Job.Publish', supportsBulk: true },
          ],
          // Defines the admin menu page
          screen: {
            route: 'acme-jobs',
            menu: {
              slug: 'acme-jobs',
              title: 'Jobs',
              capability: 'manage_options',
            },
          },
        },
      },
			    },
  },
},
```

### What You Get

Running `wpk generate` with this configuration produces a surprising amount of code:

> **Note:** Query mapping is currently derived automatically from the standard DataViews filters (search, sort, pagination). Custom functions in `wpk.config.ts` are intentionally disallowed to keep the config fully declarative.

1.  **A PHP Menu Page**: Registers a new admin page in WordPress under "Jobs".
2.  **A React Screen Component**: A new file like `.generated/ui/app/job/admin/JobsAdminScreen.tsx` is created. This component is the root of your admin page.
3.  **Pre-wired [`<ResourceDataView>`](/api/@wpkernel/ui/functions/ResourceDataView)**: The generated screen component renders the [`<ResourceDataView>`](/api/@wpkernel/ui/functions/ResourceDataView) from `@wpkernel/ui`, passing all your configuration to it automatically.
4.  **Automatic Interactivity**: The CLI generates an "interactivity fixture" that connects the actions you defined (e.g., `Job.Publish`) to the buttons in the DataView. Clicks, state changes, and API calls work out of the box.
5.  **Event Integration**: All actions dispatched by the DataView will emit standard WPKernel events, which you can listen to for custom integrations.

This generated screen is not a sample; it's a production-ready, interactive admin view with sorting, filtering, pagination, and action handling built-in.

## Building a Custom DataView Screen

While the generator is powerful, you can also build a DataView screen programmatically when you need full control or a non-standard layout.

This approach is useful for:

- Building complex UIs that go beyond a simple table.
- Integrating DataViews into existing, custom-built admin pages.

```tsx
// In a custom component, e.g., /ui/MyCustomJobScreen.tsx
import {
	createResourceDataViewController,
	ResourceDataView,
} from '@wpkernel/ui/dataviews';
import { job } from '@/resources/job'; // Your resource object

// 1. Create a controller for the DataView
const controller = [`createResourceDataViewController`](/api/@wpkernel/ui/functions/createResourceDataViewController)({
	resource: job,
	// You can pass the config from the resource, or define it inline
	config: job.ui?.admin?.dataviews!,
});

export function MyCustomJobScreen() {
	return (
		<div>
			<h1>My Custom Job Board</h1>
			<ResourceDataView
				controller={controller}
				emptyState={{
					title: 'No jobs found',
					description: 'Create a new job to get started.',
				}}
			/>
		</div>
	);
}
```

In this model, you are responsible for creating the controller and rendering the `<ResourceDataView>` component yourself.

## What's Next?

- **[Interactivity](./interactivity.md)**: Learn how the CLI automatically wires up actions and state for your generated DataViews.
- **[Events](./events.md)**: See how to listen for events emitted by user interactions within a DataView.
- **[UI Package](/packages/ui)**: Explore the `<ResourceDataView>` component and its props in more detail.
