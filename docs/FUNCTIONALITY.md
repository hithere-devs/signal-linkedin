# Signal 1.1 product plan

## The product decision

Signal should feel like a focused browser tool, not an account portal. The local experience comes first. Optional services live in their own sections.

The user delegated the design direction. Three Nano Banana Pro compositions were generated through the user's authenticated GCP project. The overview workspace was selected, with the feed-preview composition used for filter controls. Every interactive element is React, CSS, or SVG. Generated screenshots are references, not shipped UI.

## Implemented workflows

### Everyday control

The popup gives direct access to the threshold, three named presets, four filtering modes, sponsored-post handling, and a true pause control. Pausing preserves the threshold and restores visible posts. The workspace and profile are one click away.

### Profile setup

The profile editor starts with role, interests, and skills. Career context and people preferences are separate expandable sections. Tags accept Enter or comma-separated input and deduplicate case-insensitively. Profile changes require an explicit save. Unsaved drafts survive navigation between settings sections, and leaving the page triggers a browser warning. Ctrl or Command + S saves the profile.

### Filter tuning

Feed controls place a fictional example feed beside the settings. Thresholds, modes, ad handling, and pause state change the preview immediately. Preview reveals are temporary and do not override real posts.

A single decision policy handles live and example posts. Pausing and score-only mode show everything. Explicit show/hide overrides take priority during filtering. Ads follow the sponsored-post preference rather than being hidden again because their scores are low. Jobs follow the selected policy, subject to explicit people preferences.

### Understanding results

The dashboard supports 7, 14, and 30-day periods, kept/filtered activity, category composition, filtering reasons, average scores, and feedback categories. A daily breakdown and CSV export expose the underlying aggregate counts. Empty periods show zero activity instead of implied productivity gains.

Time saved assumes 9 seconds per filtered post. Sponsored posts are a subset of filtered posts and are counted once. New daily statistics use the device's calendar date. Historical records retain their stored date keys rather than undergoing a guessed timezone migration.

### Optional AI and sync

AI configuration uses explicit save and test actions instead of racing blur-time writes. Provider URL validation rejects credentials in URLs and requires HTTPS except for loopback servers. Testing a connection does not implicitly enable background AI scoring. Image analysis still requires optional image access.

Account and sync retains the existing Supabase implementation. An unconfigured build explains that local use still works. Manual restore and destructive actions require confirmation. Live provider authentication and production cloud sync require external credentials and are not simulated as successful in the web preview.

### Data control

JSON exports exclude API keys and session tokens. Local deletion and cloud-account deletion remain separate, explicit actions. The UI explains the difference before either action. Debug logging is under diagnostics rather than mixed into everyday controls.

### Public preview and distribution

GitHub Pages publishes the product site and an isolated web workspace built from the same React components. It uses clearly labeled fictional activity and separate website-local storage. No environment secrets, extension background worker, cloud configuration, or real LinkedIn data is included. API-key entry and provider calls are disabled in the web preview.

The extension remains a Manifest V3 package with only storage and alarms as required browser permissions. Its required host access remains limited to LinkedIn. Optional hosts are still granted by the user.

## Quality requirements

- Shared light and dark themes, responsive layouts, keyboard focus, labeled controls, reduced-motion support, and native confirmation dialogs.
- Score details use the browser's popover layer so a LinkedIn post cannot clip them.
- Blurred post controls cannot receive keyboard input until revealed.
- Settings and statistics writes are serialized to prevent lost overlapping updates.
- Baseline feed-rendering repairs are preserved, including stale badge cleanup and appending the Shadow DOM badge host to its post.
- Type checks, unit tests, release verification, local browser checks, and an independent design review precede publishing.

## Next functionality to consider

These are not shipped capabilities or buttons in the current UI.

- A consented, anonymized set of LinkedIn DOM fixtures for regression testing layout changes.
- Explicit conflict resolution when two browsers change synced settings offline.
- A reset for learned feedback independent of other local data.
- A saved-post library only after deciding retention, export, and privacy rules. Aggregate statistics are not a post-history database.

## Source-map caveat

The internal Graphify index reported unresolved callback endpoints and collapsed relationships. Implementation decisions were checked against the TypeScript source and tests rather than treating that index as a correctness guarantee.
