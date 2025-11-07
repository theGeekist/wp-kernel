[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / MemoryReporter

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
clear: () => void;
```

Clears all captured log entries.

#### Returns

`void`
