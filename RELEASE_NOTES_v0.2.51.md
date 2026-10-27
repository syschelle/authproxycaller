# Authproxycaller v0.2.51

## Changes since v0.2.50

- In every Companion App call, the optional DeepUnity folder path now appears immediately after `du-proxy-app.exe`.
- The `path="..."` argument is placed before `loginserver` and all remaining call parameters.
- Automated tests now explicitly verify the new parameter order.

## Verification

- `node --check src/app.js`
- `node --check src/builder.js`
- XML lint for language and hint files
- `npm test`: 23/23 passed
- Local test system: `authproxycaller:0.2.51` on port `18081`, healthy
