# Chrome Web Store submission checklist

## Account

- Register and verify a Chrome Web Store developer account.
- Confirm the publisher name and contact email.
- Verify the official site in Google Search Console if the dashboard offers it.

## Package

- Add production Supabase values to `.env`.
- Run `npm run package`.
- Verify the SHA-256 file.
- Install the ZIP's contents in a clean Chrome profile.
- Confirm `package.json` and `manifest.json` show the same version.

## Listing

- Paste the copy from `STORE_LISTING.md`.
- Upload the 128 by 128 icon.
- Upload at least one 1280 by 800 screenshot and the 440 by 280 small promo tile.
- Add the homepage, support, and privacy URLs.
- Select Productivity, English, and non-mature content.

## Privacy

- Use the single-purpose statement and permission justifications in `PRIVACY_DISCLOSURES.md`.
- Declare every applicable data category.
- Confirm the public privacy URL loads without authentication.
- Confirm the listing copy matches the current extension behavior.

## Distribution and review

- Select public distribution and intended countries.
- Add `REVIEW_NOTES.md` to the test instructions.
- Choose deferred publishing so launch timing remains controlled after approval.
- Submit for review only after the production backend, website, support URL, and clean-profile test pass.

Chrome's current publishing flow includes Package, Store Listing, Privacy, Distribution, and Test instructions. The submission can remain staged for up to 30 days after approval: <https://developer.chrome.com/docs/webstore/publish/>.
