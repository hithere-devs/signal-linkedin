# Signal Privacy Policy

**Effective date:** August 30, 2026

Signal is a Chrome extension that scores and filters posts on LinkedIn. This policy explains what data Signal handles and where it goes.

## Data Signal handles

Signal may process:

- LinkedIn post text, author details, hashtags, image descriptions, and media links needed to score visible feed posts.
- The professional profile, interests, companies, roles, and topics you enter.
- Filtering preferences, feedback signals, per-post show or hide overrides, and aggregate feed statistics.
- An email address and authentication tokens if you create an optional Signal account.
- An AI provider URL, model name, and API key if you enable optional AI analysis.

## Local processing

By default, scoring happens locally in your browser. Profile data, preferences, feedback, statistics, cached scores, and optional AI credentials are stored in `chrome.storage.local`.

Signal does not include advertising, analytics, tracking pixels, or remote executable code.

## Optional cloud sync

If you create an account, Signal uses Supabase to authenticate you and sync your profile, preferences, feedback signals, per-post overrides, and up to 30 days of aggregate statistics. Synced data is protected by row-level access controls tied to your account.

Signal does not sync:

- AI API keys
- Authentication tokens as part of your settings snapshot
- Cached LinkedIn post text or AI responses

Authentication tokens remain in Chrome's extension storage so your session can persist.

## Optional AI providers

If you enable AI analysis, Signal sends the text and metadata of posts selected for deeper analysis to the provider and model you configure. If you separately enable Vision, Signal may also send up to two images from a post. That provider's privacy policy and data handling terms apply.

Signal requests access to an AI or cloud host only when you enable the related feature. It does not sell or share data for advertising, credit, insurance, or other unrelated purposes.

## Retention and deletion

Local data remains until you remove the extension or use **Delete local data** in Settings. Synced data remains until you use **Delete account**, which deletes the account and its synced row. You can export a copy of your non-secret data from Settings.

## Chrome permissions

- **storage:** stores settings and extension data.
- **alarms:** schedules delayed and periodic account sync.
- **linkedin.com host access:** reads visible feed posts and adds filtering controls.
- **optional site access:** contacts only the cloud or AI provider host that you approve. Optional LinkedIn CDN access is requested only for Vision.

## Contact

For privacy questions, open an issue at <https://github.com/hithere-devs/signal-linkedin/issues>.

Material changes will be documented in the repository and reflected by a new effective date.

## Interactive web preview

The public web preview uses fictional feed activity. Profile and preference edits in the preview stay in this website's local storage, separate from Chrome extension storage. The preview does not read LinkedIn posts, connect to cloud accounts, or contact AI providers. API key entry is disabled.
