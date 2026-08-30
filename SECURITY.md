# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository. Include affected versions, reproduction steps, impact, and any suggested mitigation.

Maintainers will acknowledge a report within seven days and coordinate disclosure after a fix is available.

## Supported version

Only the latest Chrome Web Store and GitHub release is supported with security fixes.

## Security boundaries

- Signal does not ship remote executable code.
- AI keys stay in local extension storage and are excluded from exports and cloud sync.
- Account data is protected with Supabase row-level security.
- Provider and cloud origins are requested at the time a user enables those features.
