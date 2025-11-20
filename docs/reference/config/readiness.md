# Readiness Orchestration (`readiness`)

The `readiness` object in `wpk.config.ts` allows you to configure project-specific health checks that integrate directly with the WPKernel `doctor` command and other command readiness gates. This feature helps ensure that your plugin and its environment meet all necessary conditions for development, testing, and deployment.

By defining custom readiness helpers, you can:

- Add specific checks tailored to your plugin's dependencies or environment (e.g., external API connectivity, specific database tables, required WordPress options).
- Provide clear, actionable feedback to developers and deployers when conditions are not met.
- Ensure commands run only when the system is in a healthy state.

---

## `readiness.helpers`

This property defines an array of factory functions, each responsible for creating one or more custom readiness checks. These checks are dynamically added to WPKernel's readiness registry.

- **What it does**: Provides a list of functions that WPKernel calls to assemble the full set of readiness checks. If this array is omitted or empty, only WPKernel's built-in checks are executed.
- **Where it's used**: Each factory contributes a `ReadinessHelper` object (or objects) to the overall readiness plan, which is then utilized by the `wpk doctor` command and other CLI pre-flight checks.

**Schema:**

- **Type**: `array` of `function`s
- **Required**: No

---

## Individual Helper Factory (`readiness.helpers[]`)

Each entry in the `readiness.helpers` array is a factory function with the signature `(ctx) => ReadinessHelper`.

- **What it does**: This function is called once during the CLI's initialization to produce a `ReadinessHelper` object. This `ReadinessHelper` encapsulates the logic for a specific health check, including its unique ID, descriptive labels, tags, and the scopes it applies to.
- **`ctx` Parameter**: The factory function receives a `ctx` (context) object, which provides access to high-level information like the project's configuration (e.g., `namespace`), the Internal Representation (IR), and utility functions.
- **Check Execution**: The actual health check logic resides within the `ReadinessHelper`. These helpers can perform various checks, such as making REST API calls, querying the database, or verifying file system conditions. Errors and status updates are reported via logs.
- **Impact on CLI**: Active helpers participate in:
    - **`wpk doctor`**: Their results are displayed in the readiness status summaries.
    - **Timing Budgets**: They can adhere to defined timing budgets to prevent long-running checks from delaying CLI operations.
    - **Command Pre-flight Checks**: They can act as gates, preventing certain commands from executing if critical readiness conditions are not met.

**Schema:**

- **Type**: `function`
- **Required**: No
