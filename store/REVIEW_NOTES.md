# Chrome Web Store reviewer notes

## Core test flow

1. Install the extension and sign in to a normal LinkedIn test account.
2. Open `https://www.linkedin.com/feed/`.
3. Wait for visible feed posts to receive a numeric Signal badge.
4. Select the extension icon and change the threshold from Balanced to Strict.
5. Confirm existing posts are re-evaluated without reloading.
6. Change Filtering mode to Blur or Score only and confirm the feed updates.
7. Select a badge to view score dimensions and reasons.
8. Open **Edit profile**, change an interest, save, and return to the feed.
9. Open **Dashboard** to review aggregate statistics.

No Signal account or AI key is required for the core test flow.

For a test that does not require a LinkedIn account, open the extension's Settings page with `?welcome=1` and select **Preview Signal on a demo feed**. The bundled page uses synthetic posts with the production badge, explanation, and collapse controls.

## Optional account flow

1. Open Settings and create an account with an email and password of at least eight characters.
2. If email confirmation is enabled, confirm the email and sign in.
3. Change a profile setting and select **Sync now**.
4. Use **Restore from cloud** to verify retrieval.
5. Use **Delete account** to remove the test account and synced row.

No separate reviewer credential is required because self-service signup is available.

## Optional AI flow

The extension works fully without AI. A reviewer may choose a provider preset, enter their own test credential, approve access to that provider origin, and run **Test connection**. The extension contains no shared AI credential.

## Scope clarification

Signal reads only posts already rendered in the user's LinkedIn feed. It does not automate likes, comments, messages, follows, connection requests, scraping, or background browsing. Required host access is limited to `www.linkedin.com`; other origins are requested at the moment an optional feature is enabled.
