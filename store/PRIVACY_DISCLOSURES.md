# Chrome Web Store privacy disclosures

Use these answers as the source of truth when completing the Privacy tab. Recheck the dashboard wording before submission.

## Single purpose

Signal personalizes the user's LinkedIn feed by scoring visible posts for relevance and filtering posts below a user-selected threshold.

## Permission justifications

**storage**

Stores the user's scoring threshold, filtering mode, professional profile, feedback, aggregate statistics, optional account session, and optional AI configuration. This data is required for settings to persist between browser sessions.

**alarms**

Schedules delayed and periodic synchronization for users who opt into a Signal account. Local filtering works when sync is unavailable.

**https://www.linkedin.com/***

Reads posts already visible in the user's LinkedIn feed and inserts score badges, explanations, and filtering controls. Signal does not automate posting, messaging, connection requests, or profile changes.

**Optional host access**

Requested only after a user enables cloud sync, a configured AI provider, or Vision. Access is used only to call that selected service or retrieve LinkedIn-hosted post images for optional visual analysis.

## Data categories to disclose

- Personally identifiable information: account email address, only when an account is created.
- Authentication information: account session tokens and user-supplied AI provider credentials.
- Website content: visible LinkedIn post content used for scoring.
- User activity: filtering choices, badge feedback, and aggregate feed interaction statistics.
- User-provided content: professional profile and preference fields entered in Settings.

Do not select financial information, health information, precise location, web browsing history outside LinkedIn, or personal communications. Reassess this list whenever features change.

## Data-use certifications

- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to Signal's single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.
- Human access is limited to security, support requested by the user, legal compliance, or aggregated internal operations where the data has been de-identified.

## Public policy

https://hithere-devs.github.io/signal-linkedin/privacy.html

The policy documents local processing, Supabase account sync, configurable AI providers, retention, deletion, and every requested permission. Chrome requires an accurate policy for any extension that handles user data: <https://developer.chrome.com/docs/webstore/program-policies/privacy/>.
