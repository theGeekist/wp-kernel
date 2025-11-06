[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / DataViewHelper

# Type Alias: DataViewHelper

```ts
type DataViewHelper = object;
```

Convenience helpers for interacting with ResourceDataView in tests.

## Properties

### root()

```ts
root: () => Locator;
```

Root locator for the DataView wrapper.

#### Returns

`Locator`

---

### waitForLoaded()

```ts
waitForLoaded: () => Promise<void>;
```

Wait until the DataView reports that loading has finished.

#### Returns

`Promise`\<`void`\>

---

### search()

```ts
search: (value) => Promise<void>;
```

Fill the toolbar search control.

#### Parameters

##### value

`string`

#### Returns

`Promise`\<`void`\>

---

### clearSearch()

```ts
clearSearch: () => Promise<void>;
```

Clear the search control.

#### Returns

`Promise`\<`void`\>

---

### getRow()

```ts
getRow: (text) => Locator;
```

Retrieve a locator for a row containing the provided text.

#### Parameters

##### text

`string`

#### Returns

`Locator`

---

### selectRow()

```ts
selectRow: (text) => Promise<void>;
```

Toggle selection for a row that matches the provided text.

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`void`\>

---

### runBulkAction()

```ts
runBulkAction: (label) => Promise<void>;
```

Trigger a bulk action button by its visible label.

#### Parameters

##### label

`string`

#### Returns

`Promise`\<`void`\>

---

### getSelectedCount()

```ts
getSelectedCount: () => Promise & lt;
number & gt;
```

Read the bulk selection counter rendered in the footer.

#### Returns

`Promise`\<`number`\>

---

### getTotalCount()

```ts
getTotalCount: () => Promise & lt;
number & gt;
```

Read the total item count exposed by the wrapper metadata.

#### Returns

`Promise`\<`number`\>
