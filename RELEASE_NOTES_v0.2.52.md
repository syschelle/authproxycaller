# Authproxycaller v0.2.52

## Changes since v0.2.51

- External RIS variable values are now used exactly as entered.
- The application no longer adds percent signs before and after external RIS username, password, patient ID, or order number variables.
- Manufacturer-specific formats such as plain names, percent-delimited variables, dollar expressions, or bracket expressions are preserved in generated URL and Companion App calls.
- The four external RIS variable fields now use the neutral placeholder `parameter`.
- Field hints in German, English, and French clarify that values are passed through unchanged.

## Verification

- JavaScript syntax checks passed.
- All language and hint XML files were parsed successfully.
- Automated tests passed, including exact preservation of manufacturer-defined external RIS variable formats.
- Local test system: `authproxycaller:0.2.52` on port `18081`, healthy.
