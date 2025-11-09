# Blocks

WPKernel embraces WordPress's native block structure, enhancing it with a powerful, discovery-based generation process. Instead of declaring blocks in `wpk.config.ts`, the CLI automatically finds them by looking for `block.json` files in your project.

This guide walks you through creating a block and letting the WPKernel CLI accelerate your development.

## Step 1: Create Your Block

The source of truth for a block in WPKernel is its `block.json` file. To create a new block, simply create a directory and add a `block.json` file to it.

```bash
mkdir -p src/blocks/my-first-block
```

Now, create `src/blocks/my-first-block/block.json`:

```json
{
	"apiVersion": 3,
	"name": "my-plugin/my-first-block",
	"title": "My First WPKernel Block",
	"category": "widgets",
	"icon": "smiley",
	"editorScript": "file:./index.tsx"
}
```

At this point, you have a directory containing just a single `block.json` file. The `editorScript` property points to an `index.tsx` file that doesn't exist yet.

## Step 2: Run `wpk generate`

This is where the magic happens. Run the generate command from your terminal:

```bash
wpk generate
```

WPKernel's generator will:

1.  Discover `src/blocks/my-first-block/block.json`.
2.  See that it's a JavaScript-only block (because there is no `render.php`).
3.  Notice that the `index.tsx` file referenced in `editorScript` is missing.
4.  **Automatically create a stub `index.tsx` for you!**

Your new `src/blocks/my-first-block/index.tsx` will look something like this:

```tsx
/* AUTO-GENERATED WPK STUB: safe to edit. */
import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';

function Edit() {
	return <div>{metadata.title || 'Block'} (edit)</div>;
}

// Saved HTML is final for JS-only blocks:
const save = () => <div>{metadata.title || 'Block'} (save)</div>;

registerBlockType(metadata as any, { edit: Edit, save });
```

You now have a fully functional, registerable WordPress block with zero boilerplate. You can immediately start editing the `Edit` component to build your block's editor experience.

## Step 3: Add Server-Side Rendering (SSR)

If your block needs to render dynamic content or access protected data, you'll need it to be server-side rendered. WPKernel makes this seamless.

Simply add a `render.php` file to your block's directory:

`src/blocks/my-first-block/render.php`:

```php
<?php
/**
 * @var array    $attributes The block attributes.
 * @var string   $content    The block inner content.
 * @var WP_Block $block      The block instance.
 */
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
	<p>
		Hello from PHP! Your title is: <?php echo esc_html( $attributes['title'] ?? 'N/A' ); ?>
	</p>
</div>
```

Now, when you run `wpk generate` again, the CLI will:

1.  Detect the presence of `render.php`.
2.  Categorize `my-plugin/my-first-block` as an SSR block.
3.  Generate the necessary PHP code in its server-side registrar to register the block and point to your `render.php` file.

No other changes are needed. The block will now be rendered by the server.

## What WPKernel Handles for You

By following this convention-based approach, WPKernel's generator takes care of the tedious parts of block development:

- **Automatic Registration**: Generates PHP and JS "registrar" files that call `register_block_type` for all discovered blocks.
- **Stub Generation**: Creates placeholder script files so you can get to work faster.
- **Script Module Handling**: Correctly handles `editorScriptModule` and `viewScriptModule` for modern, efficient script loading in WordPress.

This workflow allows you to focus on building your block's functionality, not on the boilerplate of registering it.

## What's Next?

- **[Resources Guide](./resources.md)**: Fetch data for your blocks using WPKernel resources.
