# Signal: LinkedIn Feed Intelligence

Signal is an open-source Chrome extension that scores visible LinkedIn posts against your interests, explains each decision, and filters low-value content from your feed.

It works offline by default. Account sync and external AI analysis are optional.

## What it does

- Scores posts from 0 to 100 using relevance, information density, actionability, originality, evidence, technical depth, and career value.
- Penalizes low-information personal stories, promotional posts, and engagement bait.
- Supports Collapse, Hide, Blur, and Score-only modes.
- Detects and removes sponsored content.
- Shows reasons and classification details on every score badge.
- Learns from show, hide, and feedback actions.
- Tracks local feed statistics and estimated time saved.
- Syncs profile settings across browsers through an optional Supabase account.
- Supports optional OpenAI-compatible providers, including local Ollama and LM Studio servers.

Signal is independent and is not affiliated with LinkedIn or Microsoft.

## Install from source

Requirements: Node.js 20 or newer, npm, and Chrome 116 or newer.

```bash
git clone https://github.com/hithere-devs/signal-linkedin.git
cd signal-linkedin
npm ci
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the generated `dist/` directory.
5. Open `https://www.linkedin.com/feed/`.

The signed Chrome Web Store link will be added after review.

## Use Signal

Open the toolbar popup to choose a score threshold and filtering mode. Open Settings to describe your role, skills, interests, target companies, career goals, and topics to avoid.

The local heuristic scorer works without an account or network request. When AI analysis is enabled, Signal requests access to the exact provider host and sends only posts selected for deeper analysis. Images are sent only when Vision is enabled separately.

## Optional account sync

Account sync stores your profile, preferences, feedback, post overrides, and up to 30 days of aggregate statistics. It does not sync AI keys, cached post text, or AI responses.

Self-hosters can configure Supabase by following [`docs/CLOUD_SETUP.md`](docs/CLOUD_SETUP.md). Official release builds receive the project URL and public anon key through GitHub Actions secrets.

## Privacy and security

- No analytics, ads, tracking pixels, or remote executable code.
- Local data is stored in `chrome.storage.local`.
- AI keys are excluded from exports and cloud sync.
- Required host access is limited to LinkedIn.
- Cloud and AI hosts are optional permissions requested when a user enables those features.
- Supabase row-level security restricts synced state to its authenticated owner.

Read the full [Privacy Policy](PRIVACY.md), [Security Policy](SECURITY.md), and [Terms](TERMS.md).

## Architecture

The extension uses Manifest V3, React, TypeScript, and esbuild.

Visible posts pass through three stages:

1. A cached result is reused when available.
2. Local heuristics score every uncached post.
3. Ambiguous posts can be sent to an optional configured AI provider, with two requests allowed at once and a 20-second timeout.

The content script uses semantic and legacy LinkedIn selectors, a mutation observer for infinite scroll, batched rendering, and Shadow DOM isolation. The service worker owns storage, scoring orchestration, account sessions, and sync.

## Development

```bash
npm run dev          # rebuild on changes
npm run typecheck    # strict TypeScript check
npm test             # unit tests
npm run check        # types, tests, production dependency audit
npm run package      # verify and create a versioned store ZIP plus SHA-256
```

Release artifacts are written to `release/`. Production builds are cleaned before each build and the manifest version is read from `package.json`.

## Repository map

```text
public/                 Manifest, HTML shells, generated icons
src/ai/                 Heuristic and optional LLM scoring
src/background/         MV3 service worker and message routing
src/cloud/              Supabase authentication and state sync
src/content/            LinkedIn extraction, filtering, and badges
src/popup/              Toolbar controls
src/settings/           Profile, provider, account, and data controls
src/dashboard/          Seven-day feed dashboard
supabase/migrations/    Row-level-secured cloud schema
site/                   GitHub Pages product and policy site
tests/                  Unit tests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and focused pull requests are welcome. Never include private feed content, API keys, or authentication tokens in an issue or commit.

## License

MIT
