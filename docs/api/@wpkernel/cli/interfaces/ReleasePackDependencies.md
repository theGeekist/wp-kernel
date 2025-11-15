[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / ReleasePackDependencies

# Interface: ReleasePackDependencies

## Properties

### access()

```ts
readonly access: (path, mode?) => Promise<void>;
```

Tests a user's permissions for the file or directory specified by `path`.
The `mode` argument is an optional integer that specifies the accessibility
checks to be performed. `mode` should be either the value `fs.constants.F_OK` or a mask consisting of the bitwise OR of any of `fs.constants.R_OK`, `fs.constants.W_OK`, and `fs.constants.X_OK`
(e.g.`fs.constants.W_OK | fs.constants.R_OK`). Check `File access constants` for
possible values of `mode`.

If the accessibility check is successful, the promise is fulfilled with no
value. If any of the accessibility checks fail, the promise is rejected
with an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object. The following example checks if the file`/etc/passwd` can be read and
written by the current process.

```js
import { access, constants } from 'node:fs/promises';

try {
	await access('/etc/passwd', constants.R_OK | constants.W_OK);
	console.log('can access');
} catch {
	console.error('cannot access');
}
```

Using `fsPromises.access()` to check for the accessibility of a file before
calling `fsPromises.open()` is not recommended. Doing so introduces a race
condition, since other processes may change the file's state between the two
calls. Instead, user code should open/read/write the file directly and handle
the error raised if the file is not accessible.

#### Parameters

##### path

`PathLike`

##### mode?

`number`

#### Returns

`Promise`\<`void`\>

Fulfills with `undefined` upon success.

#### Since

v10.0.0

---

### exec()

```ts
readonly exec: {
  (file): PromiseWithChild<{
}>;
  (file, args): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
  (file, options): PromiseWithChild<{
}>;
  (file, args, options): PromiseWithChild<{
}>;
};
```

#### Call Signature

```ts
(file): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(file, args): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithBufferEncoding`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptionsWithStringEncoding`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(file, options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`\<\{
\}\>

#### Call Signature

```ts
(
   file,
   args,
   options): PromiseWithChild<{
}>;
```

##### Parameters

###### file

`string`

###### args

readonly `string`[] | `null` | `undefined`

###### options

`ExecFileOptions` | `null` | `undefined`

##### Returns

`PromiseWithChild`\<\{
\}\>

---

### readFile()

```ts
readonly readFile: {
  (path, options?): Promise<Buffer<ArrayBufferLike>>;
  (path, options): Promise<string>;
  (path, options?): Promise<string | Buffer<ArrayBufferLike>>;
};
```

#### Call Signature

```ts
(path, options?): Promise<Buffer<ArrayBufferLike>>;
```

Asynchronously reads the entire contents of a file.

If no encoding is specified (using `options.encoding`), the data is returned
as a `Buffer` object. Otherwise, the data will be a string.

If `options` is a string, then it specifies the encoding.

When the `path` is a directory, the behavior of `fsPromises.readFile()` is
platform-specific. On macOS, Linux, and Windows, the promise will be rejected
with an error. On FreeBSD, a representation of the directory's contents will be
returned.

An example of reading a `package.json` file located in the same directory of the
running code:

```js
import { readFile } from 'node:fs/promises';
try {
	const filePath = new URL('./package.json', import.meta.url);
	const contents = await readFile(filePath, { encoding: 'utf8' });
	console.log(contents);
} catch (err) {
	console.error(err.message);
}
```

It is possible to abort an ongoing `readFile` using an `AbortSignal`. If a
request is aborted the promise returned is rejected with an `AbortError`:

```js
import { readFile } from 'node:fs/promises';

try {
	const controller = new AbortController();
	const { signal } = controller;
	const promise = readFile(fileName, { signal });

	// Abort the request before the promise settles.
	controller.abort();

	await promise;
} catch (err) {
	// When a request is aborted - err is an AbortError
	console.error(err);
}
```

Aborting an ongoing request does not abort individual operating
system requests but rather the internal buffering `fs.readFile` performs.

Any specified `FileHandle` has to support reading.

##### Parameters

###### path

filename or `FileHandle`

`PathLike` | `FileHandle`

###### options?

`object` & `Abortable` | `null`

##### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Fulfills with the contents of the file.

##### Since

v10.0.0

#### Call Signature

```ts
(path, options): Promise<string>;
```

Asynchronously reads the entire contents of a file.

##### Parameters

###### path

A path to a file. If a URL is provided, it must use the `file:` protocol.
If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.

`PathLike` | `FileHandle`

###### options

An object that may contain an optional flag.
If a flag is not provided, it defaults to `'r'`.

`BufferEncoding` | `object` & `Abortable`

##### Returns

`Promise`\<`string`\>

#### Call Signature

```ts
(path, options?): Promise<string | Buffer<ArrayBufferLike>>;
```

Asynchronously reads the entire contents of a file.

##### Parameters

###### path

A path to a file. If a URL is provided, it must use the `file:` protocol.
If a `FileHandle` is provided, the underlying file will _not_ be closed automatically.

`PathLike` | `FileHandle`

###### options?

An object that may contain an optional flag.
If a flag is not provided, it defaults to `'r'`.

`BufferEncoding` | `ObjectEncodingOptions` & `Abortable` & `object` | `null`

##### Returns

`Promise`\<`string` \| `Buffer`\<`ArrayBufferLike`\>\>
