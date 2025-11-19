# UI Configuration

Use this page to describe the admin DataViews/UI settings. The headings use the config paths so the built-in VitePress outline gives readers a right-hand TOC.

## `resources.<key>.ui.admin.dataviews`

High-level switch for generating admin screens; describe when to enable it and any defaults.

## `resources.<key>.ui.admin.dataviews.fields`

Explain the field descriptor shape and how it renders columns/fields.

## `resources.<key>.ui.admin.dataviews.defaultView`

Document what goes into the default view object (sorts/filters/layout) and when it applies.

## `resources.<key>.ui.admin.dataviews.actions`

Describe row/bulk action descriptors and how they’re bound.

## `resources.<key>.ui.admin.dataviews.search / searchLabel`

Note how to toggle search and customise the label.

## `resources.<key>.ui.admin.dataviews.empty`

Explain empty-state configuration and supported shape.

## `resources.<key>.ui.admin.dataviews.perPageSizes`

List how to configure page size options.

## `resources.<key>.ui.admin.dataviews.defaultLayouts`

Describe layout defaults keyed by layout type (table/grid, etc.).

## `resources.<key>.ui.admin.dataviews.views`

Detail saved view descriptors `{ id, label, view, isDefault?, description? }`.

## `resources.<key>.ui.admin.dataviews.preferencesKey`

Note how this key is used for storing user preferences.

## `resources.<key>.ui.admin.dataviews.interactivity`

Document `feature` and any other interactivity switches.

## `resources.<key>.ui.admin.dataviews.screen`

Explain screen wiring: `component`, `route`, `resourceImport`/`resourceSymbol`, `wpkernelImport`/`wpkernelSymbol`.

## `resources.<key>.ui.admin.dataviews.screen.menu`

Describe admin menu wiring: required `slug`/`title`, optional `capability`, `parent`, `position`, and how menus are registered.
