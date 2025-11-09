# DataView Interactivity

WPKernel leverages the WordPress Interactivity API to make admin screens dynamic. For DataViews generated from `wpk.config.ts`, this interactivity is configured and wired up **automatically**.

## Automatic Interactivity for DataViews

When you define a `ui.admin.dataviews` block in your resource configuration, the WPKernel CLI doesn't just generate a static React component; it generates a fully interactive experience.

Consider this snippet from `wpk.config.ts`:

```ts
// In wpk.config.ts
dataviews: {
  // ...
  actions: [
    { id: 'jobs.publish', action: 'Job.Publish', supportsBulk: true },
  ],
  screen: {
    // ...
  },
},
```

### How it Works

1.  **`data-wp-interactive` Attribute**: The CLI generates the root component for your admin screen with the `data-wp-interactive` attribute, marking it as an interactive region.

2.  **Generated Interactivity Fixture**: The most important step is the generation of an "interactivity fixture". This is a TypeScript file that exports a function, something like `createJobDataViewInteraction`.

3.  **Wiring Everything Together**: This generated function does the heavy lifting:
    - It imports [`createDataViewInteraction`](/api/@wpkernel/ui/functions/createDataViewInteraction) from `@wpkernel/ui/dataviews`.
    - It passes your resource, your configured actions (like `Job.Publish`), and the DataView store to this function.
    - It returns a complete object of state and actions that the Interactivity API can use.

The result is that the "Publish" button in your generated DataView is automatically connected to your `Job.Publish` WPKernel Action. When a user clicks it, the action is dispatched, the API call is made, caches are invalidated, and events are emitted - all without you writing a single line of client-side event handling code.

## Custom Interactivity

While DataViews get interactivity for free, you can define your own interactive components for other use cases, such as custom blocks or widgets. This is where you would use the [`defineInteraction`](/api/@wpkernel/core/functions/defineInteraction) function directly.

This is useful when you need client-side behavior that doesn't fit the DataView model.

```typescript
// In /ui/interactions/MyCustomForm.ts
import { defineInteraction } from '@wpkernel/core/interactivity';
import { SubmitEnquiry } from '@/actions/SubmitEnquiry';

// Defines an interactive store named 'my-plugin/my-custom-form'
export const useMyCustomForm = defineInteraction('my-plugin/my-custom-form', {
	// Initial state for the component
	state: () => ({
		isSaving: false,
		errorMessage: null,
	}),
	// Callbacks that can be triggered from the UI
	actions: {
		async submitForm(event) {
			this.state.isSaving = true;
			this.state.errorMessage = null;
			const formData = new FormData(event.target);

			try {
				// Always route writes through a WPKernel Action
				await SubmitEnquiry({ data: formData });
			} catch (e) {
				this.state.errorMessage = e.message;
			} finally {
				this.state.isSaving = false;
			}
		},
	},
});
```

You would then connect this to your PHP-rendered block using the `data-wp-interactive` and `data-wp-on-click` attributes, as described in the official WordPress Interactivity API documentation.

## What's Next?

- **[Actions](./actions.md)**: Review how to define the Actions that your interactive components will call.
- **[WordPress Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)**: Read the official documentation for the full API reference.
