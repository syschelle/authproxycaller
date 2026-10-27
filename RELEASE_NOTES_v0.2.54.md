# Authproxycaller v0.2.54

## Changes

- Added the `app_usr` audit user parameter to SVF and external RIS Companion App calls when **Audit log user** is enabled.
- Kept generic test URL and test Companion App calls unchanged without `app_usr`.
- Preserved the configured external RIS username variable exactly when it is used as the audit user.

## Verification

- JavaScript syntax checks passed.
- All language and hint XML files passed XML validation.
- All 28 automated tests passed.
- Browser smoke tests confirmed that `app_usr` is absent from both generic test sections and present in every generated SVF/external RIS URL and Companion App call when enabled.
- The local test container is healthy on port `18081` and serves version `v0.2.54`.
