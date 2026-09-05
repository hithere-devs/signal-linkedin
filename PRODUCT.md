# Signal

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product purpose

Signal is an MIT-licensed Chrome extension that scores LinkedIn posts against a professional profile, explains its decisions, and filters posts below a chosen threshold. Local scoring works without an account or an AI provider.

## Users

Working assumption, delegated by the user for this redesign: professionals who use LinkedIn to learn, follow their industry, and find relevant opportunities without spending time on engagement bait. The existing starter profile targets software engineers and startup builders; it is editable, not a restriction on the audience.

## Operating context

The toolbar popup controls the current feed. Settings define the profile, filtering preferences, optional AI provider, account, and local data controls. The dashboard reports aggregate feed activity. A separate demonstration feed shows the filtering interaction without visiting LinkedIn.

## Capabilities and constraints

- React 19, TypeScript, esbuild, and Chrome Manifest V3. No framework migration is needed.
- Scores range from 0 to 100. Collapse, hide, blur, and score-only modes already exist.
- Post explanations include seven positive dimensions and penalties. Users can show a filtered post and give feedback.
- Chrome local storage is the default. Optional Supabase sync excludes AI keys, cached post text, and AI responses.
- External AI is opt-in. It uses a configured OpenAI-compatible provider, with separate permission for image analysis.
- The extension must not post, react, message, or otherwise act on a user's LinkedIn account.
- Aggregate statistics are not a record of saved articles. Time saved is an estimate, not a measured productivity claim.
- No public store availability, customer count, testimonials, or performance claims may be invented.

## Brand commitments

Keep the Signal name, open-source licensing, local-first behavior, and plain language. The user explicitly delegated UI, UX, and feature decisions and asked for implementation, not a standalone HTML proposal. Visual choices and the initial audience framing are delegated assumptions, not separately confirmed research.

## Evidence on hand

README.md, PRIVACY.md, the implemented extension, unit tests, and the example feed in public/demo.html. There is no user research or verified testimonial material in the repository.

## Product principles

- Make the everyday filter controls easy to reach.
- Explain what changed and let the user undo filtering.
- Separate optional services from the core local experience.
- Show actual data honestly and label examples as examples.
- Keep new contributor setup reproducible.

## Open decisions

Chrome Web Store publication and production cloud credentials are outside this redesign. Cross-device sync conflicts and long-term post history need separate product decisions before expansion.
