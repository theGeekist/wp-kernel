[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewPreferenceScope

# Type Alias: DataViewPreferenceScope

```ts
type DataViewPreferenceScope = 'user' | 'role' | 'site';
```

Preference scope levels in WordPress

Determines where preferences are stored and their precedence:

- `user` - Per-user preferences (highest priority)
- `role` - Per-role preferences (medium priority)
- `site` - Site-wide preferences (lowest priority)
