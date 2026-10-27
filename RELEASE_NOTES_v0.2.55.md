# Authproxycaller v0.2.55

## Changes

- Companion App command parameters now use consistent double-quoted values. The technical `remote=%` marker and the standalone debug level remain unchanged.
- External RIS configuration now includes a dedicated SUID variable name.
- External RIS study calls use the configured SUID variable unchanged in URL and Companion App output.

## Verification

- JavaScript syntax checks completed successfully.
- All translation and hint XML files passed XML validation.
- The complete automated test suite passed.
- The local test container on port `18081` was updated and verified healthy before publication.
