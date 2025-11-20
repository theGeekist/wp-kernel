# Directory Overrides (`directories`)

The `directories` object in `wpk.config.ts` lets you control **where the generated artifacts are applied** inside your project.
WPKernel always generates canonical files into `.wpk/…` — this directory is deterministic and never configurable.
The `directories` config controls a _second step_: **`wpk apply`**, which copies (or links) those canonical outputs into the working directories of your choosing.

This is valuable when you want generated assets to live inside first-class parts of your project, such as:

- `src/blocks/` for Gutenberg blocks,
- `includes/rest/` for REST controllers,
- `my-plugin/plugin.php` for the plugin entry point.

If you don’t configure `directories`, nothing is applied; you simply work directly from `.wpk/`.
If you _do_ configure paths, only those surfaces are applied.

---

## Supported Directory Keys

WPKernel supports the following keys.
Each maps a logical output surface → a workspace-relative path.

---

### `directories.blocks` / `directories.blocks.applied`

Generated files under:

- `.wpk/blocks/**` (JS/SSR registration code, manifests, renderers)

can be applied into a custom working directory.

- **What it does**
  Routes all block-related artifacts into your chosen folder during `wpk apply`.

- **Common reason to use it**
  Keeping Gutenberg blocks under `src/blocks/**` so they behave like first-class source code in your repo.

- **Example**

    ```ts
    directories: {
    	blocks: 'src/blocks';
    }
    ```

If you specify `blocks.applied`, it behaves the same — it simply mirrors the internal naming used by the layout manifest.

---

### `directories.controllers` / `directories.controllers.applied`

Generated PHP controller files under `.wpk/controllers/**` can be applied to a custom directory.

- **What it does**
  Applies REST controllers (list/get/create/update/remove) into your own plugin folder structure.

- **Example**

    ```ts
    directories: {
    	controllers: 'includes/rest-controllers';
    }
    ```

This is useful when you prefer your plugin's “real” PHP code to live in `includes/` or `app/` rather than in `.wpk/`.

---

### `directories.plugin` / `directories.plugin.loader`

Controls where the generated `plugin.php` bootstrap file is placed.

- **What it does**
  Moves the final plugin loader file out of `.wpk/plugin/plugin.php` and into the directory that WordPress expects to read from.

- **Example**

    ```ts
    directories: {
    	plugin: 'my-plugin';
    }
    ```

This results in:

```
my-plugin/plugin.php
```

while `.wpk/plugin/plugin.php` remains untouched and canonical.

---

## Schema

- **Type:** `object`

- **Properties:**
  Each key (`blocks`, `controllers`, `plugin`, and their `.applied` variants) accepts a `string` representing a workspace-relative path.

- **Required:** None; the entire object is optional.

- **Minimum length:** 1 (for each path string).
