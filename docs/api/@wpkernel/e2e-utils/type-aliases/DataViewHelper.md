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
waitForLoaded: () => Promise&lt;void&gt;;
```

Wait until the DataView reports that loading has finished.

#### Returns

`Promise`\&lt;`void`\&gt;

---

### search()

```ts
search: (value) => Promise&lt;void&gt;;
```

Fill the toolbar search control.

#### Parameters

##### value

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### clearSearch()

```ts
clearSearch: () => Promise&lt;void&gt;;
```

Clear the search control.

#### Returns

`Promise`\&lt;`void`\&gt;

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
selectRow: (text) => Promise&lt;void&gt;;
```

Toggle selection for a row that matches the provided text.

#### Parameters

##### text

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### runBulkAction()

```ts
runBulkAction: (label) => Promise&lt;void&gt;;
```

Trigger a bulk action button by its visible label.

#### Parameters

##### label

`string`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### getSelectedCount()

```ts
getSelectedCount: () => Promise & lt;
number & gt;
```

Read the bulk selection counter rendered in the footer.

#### Returns

`Promise`\&lt;`number`\&gt;

---

### getTotalCount()

```ts
getTotalCount: () => Promise & lt;
number & gt;
```

Read the total item count exposed by the wrapper metadata.

#### Returns

`Promise`\&lt;`number`\&gt;
