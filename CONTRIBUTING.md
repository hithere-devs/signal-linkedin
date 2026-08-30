# Contributing

Thanks for improving Signal.

## Development

```bash
npm ci
npm run check
npm run build
```

Load `dist/` as an unpacked extension in Chrome and test on the current LinkedIn feed. Do not include private feed content, API keys, session tokens, or personal data in issues, fixtures, screenshots, or commits.

## Pull requests

- Keep changes focused and explain user-visible behavior.
- Add tests for scoring, storage, authentication, or permission changes.
- Run `npm run package` before requesting review.
- Document new data collection or network requests in `PRIVACY.md`.
- Avoid selectors tied only to generated LinkedIn class names.

By contributing, you agree that your work is licensed under the MIT License.
