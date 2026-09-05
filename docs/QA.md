# Signal 1.1 verification

## Automated checks

Run these before publishing:

```bash
npm ci
npm run check
npm run build
npm run verify
npm run build:site
npm run verify:site
```

The test suite covers scoring, provider validation and responses, profile normalization, hashing, statistics, cloud-safe storage, serialized writes, filtering decisions, and preview isolation. The public-site verifier checks required files, local links, and the absence of extension-only entry points.

## Browser checks performed

The production-mode preview was served locally. Desktop checks used a 1440 by 1000 viewport, and mobile checks used 390 by 844.

- Switched dashboard periods and confirmed that totals changed with the selected period.
- Confirmed an empty period displays zero reviewed posts and zero estimated minutes saved.
- Tested light and dark appearance and checked layouts for horizontal overflow.
- Added repeated profile tags with different capitalization and confirmed a single tag remained.
- Navigated between settings sections with an unsaved draft and confirmed it survived.
- Saved with Command + S and confirmed the profile persisted after reload.
- Changed threshold presets, filtering modes, and pause state and checked the example-post decisions.
- Confirmed score-only mode disables ad filtering and restores all posts.
- Confirmed a remote HTTP provider URL is rejected and that preview API-key entry and provider tests are disabled.
- Opened the local-data deletion dialog and canceled it with Escape. No local or cloud account data was deleted during browser testing.
- Opened actual Shadow DOM score details, used feedback, and revealed a filtered demo post.
- Switched from blur to score-only and confirmed no blur classes or inert children remained.
- Confirmed pausing the native demo removes score badges and restores all four fictional posts.
- Tested the skip link without changing the current settings section.
- Checked the public site's navigation and links to the interactive workspace.

Browser tools captured some unrelated errors from an existing browser extension. They were not emitted by Signal's scripts.

## Independent design review

Final disposition: ship. Both material findings were resolved.

- Secondary text now meets at least 4.68:1 contrast across the affected light-theme backgrounds.
- First-viewport screenshots were recaptured without macOS elastic overscroll. The review includes the populated category/reason panels and complete filter-preview layout.

The reviewer confirmed the approved layout, typography, semantic controls, compact popup, and separation of local use from optional services.

The documentation pass also prompted a self-hosted public display face. A narrow follow-up review confirmed that Manrope preserves the desktop and mobile layout without clipping. Its OFL notice ships with the font.

## What these checks do not prove

The web preview is not a live LinkedIn integration test. It deliberately uses fictional posts and isolated local storage. A real LinkedIn account, real external AI requests, and production Supabase authentication were not exercised. The extension retains those existing integrations, and the package keeps the same required permission scope.

Before a store submission, load the release in a fresh Chrome profile, inspect the current LinkedIn DOM, and test an opted-in provider and configured sync account. Do not publish private feed text, API keys, or account tokens in bug reports.
