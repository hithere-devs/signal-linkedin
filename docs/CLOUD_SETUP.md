# Cloud sync setup

Signal works without an account. Cloud sync is an optional Supabase deployment that stores each user's profile, preferences, feedback signals, and 30 days of aggregate feed statistics.

API keys, cached post text, and authentication tokens are never included in the synced snapshot.

## Create the backend

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/migrations/001_signal_user_state.sql`.
3. In **Authentication > Providers > Email**, enable email/password sign-in.
4. Decide whether email confirmation is required. Signal supports both confirmation-on and confirmation-off flows.
5. Set the project Site URL to the public Signal website. Password reset links use the project's authentication settings.

The migration enables row-level security. Users can only read or modify the row whose `user_id` matches their authenticated Supabase user. The included account-deletion function can only delete the caller's own account.

## Configure a build

Copy `.env.example` to `.env` and set:

```dotenv
SIGNAL_SUPABASE_URL=https://your-project.supabase.co
SIGNAL_SUPABASE_ANON_KEY=your-public-anon-key
```

Then build or package the extension:

```bash
npm run package
```

The anon key is a public client identifier, not a service-role secret. Never put a Supabase service-role key in `.env` or an extension bundle.

## Verify row-level security

Before releasing:

1. Create two test accounts.
2. Sign in as account A and save a profile.
3. Confirm account B cannot query or update account A's row.
4. Delete account A from Signal Settings and confirm both the Auth user and state row are gone.
5. Inspect the packaged JavaScript and confirm it contains no service-role key.

## Sync behavior

- Local changes are queued and synced after one minute.
- A periodic sync runs every 30 minutes while Chrome is active.
- The newest complete snapshot wins on automatic sync.
- Settings offers explicit **Upload this browser** and **Restore from cloud** controls for recovery.
- Local scoring and filtering continue if Supabase is unavailable.
