# Plugin Metadata (`meta`)

The top-level `meta` object in `wpk.config.ts` controls the metadata WordPress uses in the generated `plugin.php` loader file. These fields determine what administrators see in the WordPress plugin list, such as the name, description, author, and version.

While all fields are optional and have sensible defaults, configuring them gives your plugin a professional and polished presence.

These fields do not influence generation logic outside the plugin loader, they exist purely to describe your plugin to WordPress.

---

## `meta.name`

This field sets the human-readable name for your plugin. It's the most prominent identifier in the WordPress admin area.

- **What it does**: Defines the value for the `Plugin Name` header in the main plugin file.
- **Where it's used**: Displayed in the "Plugin" column on the WordPress Plugins screen.
- **Default**: If you omit this field, WPKernel defaults to the project's root `namespace`, converted to title case (e.g., `acme-project` becomes `Acme Project`).

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.description`

This field provides the short descriptive text that appears directly below the plugin's name in the WordPress admin.

- **What it does**: Sets the value for the `Description` header in the main plugin file.
- **Where it's used**: Displayed in the "Description" column on the WordPress Plugins screen, providing key details about the plugin's purpose.
- **Default**: If omitted, WPKernel provides a default string: `Bootstrap loader for the <name> WPKernel integration.`, where `<name>` is the value of `meta.name`.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.version`

This field specifies the version number of your plugin. It's a critical piece of metadata for development, maintenance, and update management.

- **What it does**: Sets the `Version` header in the main plugin file.
- **Where it's used**: Displayed in the plugin description block and used by WordPress to handle caching and determine if a new version is available.
- **Default**: If omitted, the version defaults to `0.1.0`.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.requiresAtLeast`

This field declares the minimum version of WordPress that your plugin is compatible with. WordPress uses this information to prevent activation on older, unsupported sites.

- **What it does**: Sets the `Requires at least` header in the main plugin file.
- **Where it's used**: Displayed in the plugin details and checked by WordPress during activation.
- **Default**: If omitted, WPKernel sets a default of `6.7`.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.requiresPhp`

This field declares the minimum version of PHP that your plugin requires to function correctly. WordPress will prevent the plugin from being activated or run on servers with an older PHP version.

- **What it does**: Sets the `Requires PHP` header in the main plugin file.
- **Where it's used**: Displayed in the plugin details and checked by WordPress to ensure server compatibility.
- **Default**: If omitted, WPKernel sets a default of `8.1`.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.textDomain`

This field defines the unique identifier for your plugin's translations, which is essential for internationalization (i18n).

- **What it does**: Sets the `Text Domain` header in the plugin file.
- **Where it's used**: WordPress uses this value to load the correct text files (`.mo` and `.po`) for the user's language, allowing your plugin's interface to be translated.
- **Default**: If omitted, WPKernel uses a sanitized version of the root `namespace` as the default text domain.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.author`

This field specifies the name of the plugin's author or organization.

- **What it does**: Sets the `Author` header in the main plugin file.
- **Where it's used**: Displayed in the "By" line on the WordPress Plugins screen.
- **Default**: If omitted, the author defaults to `WPKernel Contributors`.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.authorUri`

This field provides a URL that links to the author's website or profile.

- **What it does**: Sets the `Author URI` header in the main plugin file.
- **Where it's used**: The author's name on the Plugins screen becomes a hyperlink pointing to this URL.
- **Default**: This field is not set by default.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.pluginUri`

This field provides a URL to the plugin's official homepage, documentation, or marketing site.

- **What it does**: Sets the `Plugin URI` header in the main plugin file.
- **Where it's used**: Adds a "Visit plugin site" link on the Plugins screen.
- **Default**: This field is not set by default.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.license`

This field specifies the license under which the plugin is released, using its official SPDX identifier.

- **What it does**: Sets the `License` header in the main plugin file.
- **Where it's used**: Informs users and developers of the licensing terms.
- **Default**: If omitted, the license defaults to `GPL-2.0-or-later`, which is standard for WordPress plugins.

**Schema:**

- **Type**: `string`
- **Required**: No

---

## `meta.licenseUri`

This field provides a URL to the full text of the license specified in `meta.license`.

- **What it does**: Sets the `License URI` header in the main plugin file.
- **Where it's used**: The license name on the Plugins screen becomes a hyperlink pointing to this URL, allowing users to review the full terms.
- **Default**: This field is not set by default.

**Schema:**

- **Type**: `string`
- **Required**: No
