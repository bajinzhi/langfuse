# Web i18n guidelines

Langfuse web keeps localization code in this feature folder so product code does
not need to know about routing, cookies, or catalog internals.

## Public surface

- Use `useI18n()` in React components.
- Use `translateClientMessage()` only in client utilities that cannot call React
  hooks, such as toast helpers.
- Use `LanguageSwitcher` for user-facing locale selection.
- Keep `en` as the canonical catalog and add every key to `zh-CN`.

## Message keys

- Name keys as `domain.feature.intent`, for example
  `auth.signIn.title` or `batchExport.readyEmail`.
- Use `{name}` placeholders for values that vary at runtime.
- Do not translate user data, project names, model names, environment names,
  telemetry labels, API contracts, SDK output, or diagnostic log messages.

## Adding a localized UI string

1. Add the English key in `messages/en.ts`.
2. Add the matching Chinese key in `messages/zh-CN.ts`.
3. Consume the key through `t("key")` or `translateClientMessage("key")`.
4. Run the i18n client test to verify both catalogs stay aligned.
