# How to Use Tabs in VitePress

The tabs plugin is now configured. Here's how to use it in your markdown files:

## Basic Syntax

:::tabs

@tab JavaScript

```js
const greeting = 'Hello, World!';
console.log(greeting);
```

@tab TypeScript

```ts
const greeting: string = 'Hello, World!';
console.log(greeting);
```

@tab Python

```python
greeting = 'Hello, World!'
print(greeting)
```

:::

## Example for WPKernel - Installation

:::tabs

@tab pnpm

```bash
pnpm add @wpkernel/core @wpkernel/ui
```

@tab npm

```bash
npm install @wpkernel/core @wpkernel/ui
```

@tab yarn

```bash
yarn add @wpkernel/core @wpkernel/ui
```

:::

## Example for Code Comparison

:::tabs

@tab Old Way

```php
// Traditional WordPress
add_action('rest_api_init', function() {
    register_rest_route('my-plugin/v1', '/jobs', [
        'methods' => 'GET',
        'callback' => 'my_get_jobs',
    ]);
});
```

@tab WPKernel Way

```ts
// WPKernel approach
const job = defineResource<Job>({
	name: 'job',
	routes: {
		list: { path: '/my-plugin/v1/jobs', method: 'GET' },
	},
});
```

:::

## Tips

- Use `@tab` to define each tab
- Tab labels can be any text
- The first tab is selected by default
- You can nest code blocks and other markdown inside tabs
