# UI Configuration

Resources become truly “admin-ready” when they gain a user interface. WPKernel generates this UI using **DataViews**, a React-based admin surface that gives you sortable tables, filters, saved views, bulk actions, menu pages, and tight integration with WordPress’ interactivity runtime.

You only have to describe the **intent**. WPKernel handles the wiring.

---

## `resources.<key>.ui.admin.dataviews`

This flag is the gateway to an admin screen. When present, WPKernel generates:

- DataView fixtures (`.generated/ui/fixtures/dataviews/*.ts`)
- Interactivity fixtures (`.generated/ui/fixtures/interactivity/*.ts`)
- A React admin entrypoint (`.generated/ui/app/<resource>.tsx`)
- Optional menu registration in PHP

If omitted, the resource remains API-only. Nothing is generated on the UI side.

Most projects enable DataViews as soon as a resource has stable fields, but you can also enable it early in development — the generated UI gracefully degrades if you leave descriptors incomplete.

---

## `resources.<key>.ui.admin.dataviews.fields`

Fields define **what columns appear** in the admin table and what each column represents.

Each field descriptor can contain:

- **`id`** – a stable identifier (string). Required.
- **`label`** – column header text.
- **`type`** – e.g. `'text'`, `'number'`, `'boolean'`, `'date'`, `'computed'`.
- **`visible`** – boolean; whether the column is shown by default.
- **`sortable`** – boolean; enables client-side or server-side sorting.
- **`raw`** or **`render`** – hints for how to display the field in React.
- **`description`** – optional help text used by UI introspection.

Fields directly influence:

- Column definitions in the DataView table
- Which fields can be sorted or filtered
- Row selection behaviour
- The generated TypeScript types for the DataView fixtures

If you omit fields entirely, the UI falls back to a minimal set derived from identity and schema.

---

## `resources.<key>.ui.admin.dataviews.defaultView`

The default view dictates what someone sees the _moment they land on the screen_.

A default view may include:

- Initial **sort** (`{ by: 'createdAt', direction: 'desc' }`)
- Initial **filters** (`{ status: ['published'] }`)
- Initial **layout type** (`'table' | 'grid' | custom layouts`)
- Initial **visible columns**

This view is persisted in fixtures and becomes the baseline before user preferences kick in.

If omitted, WPKernel constructs a generic default based on fields and identity.

---

## `resources.<key>.ui.admin.dataviews.actions`

Actions describe what users can _do_ with a row or selection.

Each action descriptor can include:

- **`id`** – unique identifier, e.g. `"publish"` or `"deleteMany"`.
- **`label`** – human-readable name.
- **`type`** – `'row' | 'bulk'`.
- **`capability`** – optional override for permission checks.
- **`confirm`** – optional confirmation dialog text.
- **`handler`** – reference to a generated or custom interactivity handler.

Actions influence:

- The action dropdowns in each row
- The bulk-selection action bar
- The interactivity fixtures generated for the admin screen

If no actions are defined, the UI still functions; it simply becomes a read-only list.

---

## `resources.<key>.ui.admin.dataviews.search`

## `resources.<key>.ui.admin.dataviews.searchLabel`

Search configuration is intentionally small:

- **`search: true | false`** enables or disables the search field.
- **`searchLabel`** lets you override the placeholder text.

The search value is forwarded to the resource’s `list` handler via the query param you’ve defined (commonly `search` or `q`). If search is disabled, the UI hides the field entirely.

---

## `resources.<key>.ui.admin.dataviews.empty`

Empty-state configuration gives you control over what the UI displays when a query returns zero rows.

Supported shapes include:

- **`null`** – hide empty-state UI entirely.
- **`{ title: string, description?: string, action?: { label, href } }`** – a small panel with optional CTA.
- **`{ component: string }`** – reference a custom React component from your project.

If omitted, WPKernel supplies a soft default (“No items found”). Empty-state wiring does not affect data fetching; it only affects presentation.

---

## `resources.<key>.ui.admin.dataviews.perPageSizes`

A simple array of numbers controlling the page-size dropdown:

```ts
perPageSizes: [10, 25, 50, 100];
```

The first value becomes the initial default unless overridden by `defaultView`.
If omitted, WPKernel uses `[20, 50]`.

---

## `resources.<key>.ui.admin.dataviews.defaultLayouts`

Some DataViews support multiple layout types — e.g. _table_, _grid_, or _card_ layouts.

`defaultLayouts` lets you specify which layout should be used for each “view mode”:

```ts
defaultLayouts: {
  table: { /* config or null */ },
  grid: { /* config or null */ },
}
```

Setting a layout to `null` disables it.
Setting a layout to an object provides layout-specific overrides (column sizing, image fields, etc.).

The UI honours these defaults until a saved view or user preference overrides them.

---

## `resources.<key>.ui.admin.dataviews.views`

Saved views let users jump between curated configurations.

A saved view descriptor looks like:

```ts
{
  id: 'published',
  label: 'Published Jobs',
  description: 'Only jobs with status=published',
  isDefault: false,
  view: {
    sort: { by: 'createdAt', direction: 'desc' },
    filters: { status: ['published'] },
    layout: 'table',
  }
}
```

Saved views are:

- Included in fixtures
- Listed in a sidebar or dropdown depending on your layout
- Restored by the UI on first load
- Exported as TypeScript types for client-side helpers

You can define as many as you want; only **one** should set `isDefault: true`.

---

## `resources.<key>.ui.admin.dataviews.preferencesKey`

Preferences are stored per user in `localStorage` (or a future storage layer).
`preferencesKey` gives you control over the storage namespace.

If omitted, WPKernel uses a generated key based on:

```
<namespace>.<resource>.ui
```

Changing this key effectively resets all user preferences — useful when migrating UI layouts.

---

## `resources.<key>.ui.admin.dataviews.interactivity`

The interactivity section configures how the screen integrates with WordPress’ interactivity runtime.

The main field is:

- **`feature`** – defaults to `'admin-screen'`. You can provide a custom feature slug if you have multiple interactivity bundles or want to scope behaviour.

This value is used when generating interactivity fixtures and registering feature modules inside `.generated/ui/fixtures/interactivity`.

Future switches may include:

- Custom event handlers
- Feature-scoped middleware
- UI-side permission guards

---

## `resources.<key>.ui.admin.dataviews.screen`

This block defines how the admin screen is physically mounted inside WordPress.

### Key fields

- **`component`** – the React component to render.
  This may be a local module name or an exported symbol from your project.

- **`route`** – the admin URL fragment.
  Example: `'jobs'` becomes `/wp-admin/admin.php?page=jobs`.

- **`resourceImport`** / **`resourceSymbol`**
  These override how the DataView bootstraps the resource’s JS module.
  Useful for monorepos or custom bundlers.

- **`wpkernelImport`** / **`wpkernelSymbol`**
  Lets advanced users swap the default UI runtime (`@wpkernel/ui/dataviews`) for a fork or custom build.

The screen configuration is mirrored into both:

- the React entrypoint (`.generated/ui/app/*.tsx`)
- the PHP plugin loader that registers the admin page

If this section is missing, WPKernel generates an admin screen with defaults based on the resource key.

---

## `resources.<key>.ui.admin.dataviews.screen.menu`

When you want the resource to appear in the WordPress admin menu, describe it here.

### Required fields

- **`slug`** – unique admin slug.
  Used as the page identifier by WordPress.

- **`title`** – the text that appears in the menu.

### Optional fields

- **`capability`** – the capability required to access the menu page.
  Defaults to `manage_options` when omitted.

- **`parent`** – parent page slug.
  Common examples:
    - `options-general.php`
    - `edit.php`
    - `edit.php?post_type=your_cpt`

- **`position`** – numeric menu position.

Menu wiring feeds directly into:

- The PHP plugin loader (`add_menu_page` / `add_submenu_page`)
- The admin route that boots the React entrypoint
- The `route` you specified in the screen config

If you omit the `menu` block entirely, the admin screen still exists — it simply won’t be discoverable via the sidebar.

---

This page, together with the Resource Configuration page, forms the complete “what the config _means_” explanation. The appendix (cards) handles the strict list of paths, types, and constraints; this page teaches the _mental model_.
