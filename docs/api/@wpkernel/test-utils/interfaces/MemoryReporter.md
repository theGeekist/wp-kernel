[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / MemoryReporter

# Interface: MemoryReporter

A test utility that captures reporter output in memory.

## Properties

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance.

---

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

---

### entries

```ts
readonly entries: MemoryReporterEntry[];
```

An array of captured log entries.

---

### clear()

```ts
clear: () =&gt; void;
```

Clears all captured log entries.

#### Returns

`void`
