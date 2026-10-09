# Authproxycaller v0.2.50

## Changes since v0.2.45

- Companion App calls now pass the DeepUnity folder path as `path=...` instead of `diagnostPath=...`.
- The `path=...` value is always wrapped in double quotes, even when the path does not contain spaces.
- The Auth Proxy parameter has been fully renamed to `realm=...`; old IDP wording was removed from the UI, hints, test data and active field names.
- The Realm example value is now just `REALM`.
- The header now includes a clearly visible `GitHub` link to the repository; the version number remains linked as well.
- Docker metadata and the visible application version are now `0.2.50`.

## Verification

- `node --check src/app.js`
- `node --check src/builder.js`
- XML lint for language and hint files
- `npm test`: 23/23 passed
- Local test system: `authproxycaller:0.2.50` on port `18081`, healthy
