[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / GenerationSummary

# Interface: GenerationSummary

Aggregated summary returned by the `FileWriter.summarise` helper.

## Extends

- [`FileWriterSummary`](FileWriterSummary.md)

## Properties

### dryRun

```ts
dryRun: boolean;
```

***

### counts

```ts
counts: Record&lt;FileWriteStatus, number&gt;;
```

#### Inherited from

[`FileWriterSummary`](FileWriterSummary.md).[`counts`](FileWriterSummary.md#counts)

***

### entries

```ts
entries: FileWriteRecord[];
```

#### Inherited from

[`FileWriterSummary`](FileWriterSummary.md).[`entries`](FileWriterSummary.md#entries)
