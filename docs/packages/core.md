# @wpkernel/core

`@wpkernel/core` is the runtime spine for the WP Kernel ecosystem. Use it to declare REST resources, orchestrate actions, manage capabilities, and bridge the WordPress data layer with Script Module interactivity.

Read the generated API at [/api/core/](/api/core/), then choose the guide that matches your role:

- [Core for Plugin Developers](./core/plugin-developers.md) explains how to scaffold resources, actions, and interactivity inside a WordPress product.
- [Core for Framework Contributors](./core/framework-contributors.md) covers the maintenance workflow, testing expectations, and coordination with internal specs.

Additional background material lives in the reference guides:

- [Resources](/guide/resources)
- [Actions](/guide/actions)
- [Events](/guide/events)
- [Blocks](/guide/blocks)
- [Reporting](/guide/reporting)

## Testing helpers

`@wpkernel/test-utils/core` provides the WordPress bootstrap harness (`createWordPressTestHarness`) and helpers such as `withActionRuntimeOverrides` so action runtime mutations stay isolated. Import them from the package rather than duplicating fixture logic in individual suites.
