The generation logic for all these methods resides within the `@wpkernel/wp-json-ast` package. The file `packages/wp-json-ast/src/capability/class.ts` is the central point that assembles the `Capability` class. It imports and uses builder functions from other files in the same directory to create each specific method.

Here is the breakdown with the specific file reference for each method you asked about:

1. **`get_capability_map()` and `get_fallback_capability()`**
    - **File Reference:** `packages/wp-json-ast/src/capability/map.ts`
    - **Explanation:** This file contains the `buildCapabilityMapMethod` and `buildFallbackMethod` functions. These functions read the `definitions` and `fallback` properties from the `capabilityMap` configuration and generate the corresponding PHP methods with the hardcoded capability arrays.

2. **`permission_callback()`**
    - **File Reference:** `packages/wp-json-ast/src/capability/callback.ts`
    - **Explanation:** This file contains the `buildCallbackMethod` function. It generates the `permission_callback` method, which contains the core logic for the WordPress REST API permission check. It is intentionally designed to call the `enforce` method internally.

3. **`enforce()`**
    - **File Reference:** `packages/wp-json-ast/src/capability/enforce.ts`
    - **Explanation:** This file contains the `buildEnforceMethod` function. It generates the `enforce` method, which is responsible for looking up the capability and calling `current_user_can()`. This method is the workhorse used by the permission callback.

4. **`get_definition()`, `get_binding()`, and `create_error()`**
    - **File Reference:** `packages/wp-json-ast/src/capability/lookup.ts`
    - **Explanation:** This file contains the functions `buildGetDefinitionMethod`, `buildGetBindingMethod`, and `buildCreateErrorMethod`. These generate the helper and utility methods that provide a public API for interacting with the capability map or creating standardized error responses.

To summarize, the file `class.ts` acts as an assembler, calling functions from `map.ts`, `callback.ts`, `enforce.ts`, and `lookup.ts` to build the complete, generated `Capability` class body.
