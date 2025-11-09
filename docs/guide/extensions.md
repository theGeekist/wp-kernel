# Extensibility

WPKernel is designed to be extensible, allowing you to add new capabilities and integrate with other tools and systems. This guide will walk you through the core concepts of WPKernel's extensibility and show you how to create your own extensions.

## Core Concepts

At the heart of WPKernel's extensibility is the **pipeline**. The pipeline is a series of steps that takes your `wpk.config.ts` file as input and produces a set of artifacts (PHP files, TypeScript files, etc.) as output. You can hook into this pipeline at various points to add your own custom logic.

### The `adapters.extensions` property

The primary way to add custom logic to the pipeline is through the `adapters.extensions` property in your `wpk.config.ts` file. This property is an array of **pipeline extensions**.

```ts
// wpk.config.ts
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';
import { myCustomExtension } from './my-custom-extension';

export const wpkConfig: WPKernelConfigV1 = {
	version: 1,
	namespace: 'acme-demo',
	schemas: {},
	resources: {},
	adapters: {
		extensions: [myCustomExtension()],
	},
};
```

### The `createPipelineExtension` function

You create pipeline extensions using the `createPipelineExtension` function from the `@wpkernel/pipeline` package. This function takes an options object that defines the behavior of your extension.

There are two main patterns for creating extensions:

1.  **The `register` pattern (Dynamic):** This pattern is useful when your extension's behavior depends on the state of the pipeline at registration time. The `register` function receives the pipeline instance and can decide whether to return a hook or not.

    ```ts
    import { createPipelineExtension } from '@wpkernel/pipeline';

    export const myCustomExtension = () =>
    	createPipelineExtension({
    		key: 'my-custom-extension',
    		register(pipeline) {
    			// You can inspect the pipeline here
    			if (pipeline.context.env === 'production') {
    				// Only run in production
    				return ({ artifact }) => {
    					// Transform the artifact
    					return { artifact };
    				};
    			}
    		},
    	});
    ```

2.  **The `setup` + `hook` pattern (Static):** This pattern is for more straightforward extensions where the setup logic is separate from the hook logic.

    ```ts
    import { createPipelineExtension } from '@wpkernel/pipeline';

    export const myCustomExtension = () =>
    	createPipelineExtension({
    		key: 'my-custom-extension',
    		setup(pipeline) {
    			// Register builders or other helpers here
    		},
    		hook({ artifact }) {
    			// Transform the artifact
    			return { artifact };
    		},
    	});
    ```

### The `commit` and `rollback` protocol

For extensions that perform side effects (like writing files), you can use the `commit` and `rollback` protocol to ensure that your extension behaves correctly, even if the pipeline fails.

The `hook` function can return an object with `commit` and `rollback` functions. The `commit` function will be called only if the entire pipeline succeeds, and the `rollback` function will be called if any extension fails.

```ts
import { createPipelineExtension } from '@wpkernel/pipeline';
import fs from 'fs/promises';

export const myFileWriterExtension = () =>
	createPipelineExtension({
		key: 'my-file-writer-extension',
		hook({ artifact }) {
			const tempPath = `/tmp/${Date.now()}.json`;
			return {
				artifact,
				async commit() {
					await fs.writeFile(tempPath, JSON.stringify(artifact));
				},
				async rollback() {
					await fs.unlink(tempPath).catch(() => {});
				},
			};
		},
	});
```

## Creating Your First Extension

Let's create a simple "hello world" extension that logs a message to the console when the pipeline runs.

1.  **Create the extension file:**

    Create a new file, `my-hello-world-extension.ts`, in your project.

    ```ts
    import { createPipelineExtension } from '@wpkernel/pipeline';

    export const myHelloWorldExtension = () =>
    	createPipelineExtension({
    		key: 'my-hello-world-extension',
    		hook() {
    			console.log('Hello from my extension!');
    		},
    	});
    ```

2.  **Register the extension in `wpk.config.ts`:**

    Now, import and register your new extension in your `wpk.config.ts` file.

    ```ts
    // wpk.config.ts
    import type { WPKernelConfigV1 } from '@wpkernel/cli/config';
    import { myHelloWorldExtension } from './my-hello-world-extension';

    export const wpkConfig: WPKernelConfigV1 = {
    	version: 1,
    	namespace: 'acme-demo',
    	schemas: {},
    	resources: {},
    	adapters: {
    		extensions: [myHelloWorldExtension()],
    	},
    };
    ```

3.  **Run the WPKernel CLI:**

    Now, when you run `wpk generate`, you'll see your "Hello from my extension!" message logged to the console. This is because the extension's hook is executed during the generation step.

## Practical Example: Custom Storage

Now let's create a more advanced extension that adds a new storage type: a simple JSON file. This will demonstrate how to use builders to generate new files.

1.  **Define a custom storage type in `wpk.config.ts`:**

    First, let's add a `storage` property to a resource in our `wpk.config.ts` file. We'll use a custom `mode` called `json`.

    ```ts
    // wpk.config.ts
    import type { WPKernelConfigV1 } from '@wpkernel/cli/config';
    import { myJsonStorageExtension } from './my-json-storage-extension';

    export const wpkConfig: WPKernelConfigV1 = {
    	version: 1,
    	namespace: 'acme-demo',
    	schemas: {},
    	resources: {
    		product: {
    			name: 'product',
    			routes: {
    				list: { path: '/acme/v1/products', method: 'GET' },
    			},
    			storage: {
    				mode: 'json',
    				path: './products.json',
    			},
    		},
    	},
    	adapters: {
    		extensions: [myJsonStorageExtension()],
    	},
    };
    ```

2.  **Create the custom storage extension:**

    Now, let's create the `my-json-storage-extension.ts` file. This extension will look for resources with `storage.mode === 'json'` and generate a JSON file for them.

    ```ts
    import { createPipelineExtension } from '@wpkernel/pipeline';
    import { createBuilder } from '@wpkernel/pipeline/builders';
    import fs from 'fs/promises';

    // A simple builder that writes a file
    const jsonFileBuilder = createBuilder({
    	key: 'json-file-builder',
    	async build({ path, content }) {
    		await fs.writeFile(path, content);
    	},
    });

    export const myJsonStorageExtension = () =>
    	createPipelineExtension({
    		key: 'my-json-storage-extension',
    		hook({ artifact, context }) {
    			const resource = context.resource;

    			if (resource?.storage?.mode === 'json') {
    				const path = resource.storage.path;
    				const content = JSON.stringify([], null, 2); // Start with an empty array

    				// Add a build step to the artifact
    				artifact.buildSteps.push({
    					builder: jsonFileBuilder,
    					input: { path, content },
    				});
    			}

    			return { artifact };
    		},
    	});
    ```

3.  **Run the WPKernel CLI:**

    Now, run `wpk generate` to execute the pipeline and then `wpk apply` to merge the generated files into your project. The extension will find the `product` resource, and the `jsonFileBuilder` will create a `products.json` file in your project with an empty array as its content.

This is a simple example, but it shows the power of extensions. You can create extensions that integrate with any data source, generate any type of file, and add any custom logic to the WPKernel pipeline.

## Advanced Concepts

### Async Extensions

Extensions can be asynchronous. Both the `register` and `hook` functions can be `async` and return promises. This is useful for extensions that need to perform I/O operations, like fetching data from a remote server.

```ts
import { createPipelineExtension } from '@wpkernel/pipeline';

export const myAsyncExtension = () =>
	createPipelineExtension({
		key: 'my-async-extension',
		async register(pipeline) {
			const schema = await fetch('https://example.com/schema.json').then(
				(res) => res.json()
			);

			return ({ artifact }) => {
				// Use the schema to transform the artifact
				return { artifact };
			};
		},
	});
```

### Using Builders

As we saw in the custom storage example, you can use builders to generate files. WPKernel provides a `createBuilder` function that you can use to create your own custom builders.

Builders are simple functions that receive an `input` object and perform some action. You can add build steps to the `artifact.buildSteps` array in your extension's `hook` function.

## WPKernel's Own Extensions

WPKernel uses its own extension system to implement some of its core features. This is a great way to learn how to build your own extensions.

For example, the `createFinalizeResourceDefinitionExtension` is an internal extension that WPKernel uses to emit an event when a resource has been defined. This extension uses the `commit` and `rollback` protocol to ensure that the event is only emitted if the pipeline succeeds.

You can find the source code for this extension in `@wpkernel/core/src/pipeline/resources/extensions/createFinalizeResourceDefinitionExtension.ts`.
