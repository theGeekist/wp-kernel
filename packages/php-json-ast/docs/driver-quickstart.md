# PHP Driver Quick-start

Codemod experiments rely on the Composer-backed bridge that lives in
`@wpkernel/php-driver`. The script hydrates JSON payloads into native
`PhpParser\Node` instances, runs the pretty printer, and streams the updated AST
back to the workspace. Use this quick-start to validate the round-trip locally.

## 1. Install Composer dependencies

From the repository root run:

```bash
cd packages/php-json-ast
composer install
```

This installs `nikic/php-parser` under `packages/php-json-ast/vendor`, which the
pretty printer uses as its autoload root.

## 2. Prepare a sample AST payload

Create a temporary file that describes a simple return statement:

```bash
cat <<'JSON' > /tmp/return.ast.json
{
  "ast": [
    {
      "nodeType": "Stmt_Return",
      "attributes": {},
      "expr": {
        "nodeType": "Scalar_String",
        "attributes": {},
        "value": "Hello world"
      }
    }
  ]
}
JSON
```

The structure mirrors the interfaces exported from `src/nodes/**`-every node has
a `nodeType`, an `attributes` object, and sub node properties that match
`getSubNodeNames()` for the PHP class.

## 3. Run the pretty printer bridge

Execute the Composer script by pointing it at the workspace root (the directory
that contains `vendor/autoload.php`) and the target file name you want to
hydrate:

```bash
php packages/php-driver/php/pretty-print.php packages/php-json-ast demo.php \
  < /tmp/return.ast.json
```

The command prints a JSON object with two keys:

- `code` – the formatted PHP source with a trailing newline
- `ast` – the PHP-native AST encoded back to JSON, preserving any visitor edits

For the sample above the `code` payload renders `return 'Hello world';`. You can
pipe the JSON into `jq` or save it alongside the generated PHP to inspect the
round-trip.

## 4. Ingest PHP programs from TypeScript

Codemod pilots can now start from real PHP files. The ingestion script emits a
JSON object for each requested path:

```bash
php packages/php-json-ast/php/ingest-program.php packages/php-json-ast \
  packages/php-json-ast/fixtures/ingestion/CodifiedController.php
```

Every line on stdout contains `{ file, program }`. Pipe those lines into
`consumePhpProgramIngestion()` and the helper will queue matching
`PhpProgram` entries for `createPhpProgramWriterHelper()` to flush:

```ts
import readline from 'node:readline/promises';
import {
	consumePhpProgramIngestion,
	createPhpProgramWriterHelper,
} from '@wpkernel/php-json-ast';

const ingestion = readline.createInterface({ input: child.stdout });

await consumePhpProgramIngestion({
	context,
	source: ingestion,
	defaultMetadata: { kind: 'index-file' },
});

await createPhpProgramWriterHelper().apply({
	context,
	input,
	output,
	reporter: context.reporter,
});
```

The writer helper persists both the regenerated PHP source and a `.ast.json`
snapshot for inspection, mirroring the pretty-print workflow. In the example
above `child` is the `spawn()`ed PHP process streaming ingestion payloads.

## 5. Next steps

With the driver confirmed, you can queue programs through
`createPhpProgramWriterHelper()` inside a pipeline context. The helper drains the
builder channel, calls the same PHP script, and writes both `*.php` files and
matching `.ast.json` snapshots back to the workspace.
