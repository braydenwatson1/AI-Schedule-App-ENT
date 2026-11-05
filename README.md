# The Balancing Act — assistant-first rebuild

Start with [FRIEND-START-HERE.md](FRIEND-START-HERE.md) to preview the app or work on it with an AI. This repository contains the assistant-first rebuild.

## Two working modes

**Interactive concept demo:** open `public/standalone.html` directly. It is a single file with no server required. Or run `node server/preview.mjs` and open http://localhost:4174. The welcome flow, five tabs, chat examples, approvals, tasks, email triage, and brief-format preview work with fictional data. The demo is explicitly scripted, not connected to an AI API. Details stay in the browser. Use a fictional name and no phone number when sharing the demo. Resetting removes only this demo's local data.

**Personal server:** configure `.env` from `.env.example`, then run `node --env-file=.env server/index.mjs`. Requires Node.js 24 or later, no packages to install. It serves the same UI, adds a private single-user login, SQLite persistence, AES-256-GCM encrypted OAuth tokens, Google connections, a Responses API proposal adapter, external-action approvals, a signed two-way SMS webhook, and a basic brief scheduler. Actual provider access requires your own accounts and credentials. They have not been connected or tested live here.

Read **SETUP.md** for your iPhone + Gmail setup and the additional work required to offer a public paid product.

## What the real server implements

- Multiple Google accounts, linked separately for Gmail and primary-calendar access.
- Calendar import for a rolling month; next-24-hours view includes ongoing events. Primary calendars only; shared/secondary-calendar selection is future work.
- Up to 30 recent Gmail headers/snippets per account from the past 30 days. Gmail labels and simple keywords classify messages; this is not comprehensive AI inbox analysis. No email attachments or full bodies are fetched.
- AI chat can propose an appointment, personal task, task completion, calendar cancellation, exact email, mark-as-read, or moving a selected email to Trash. User approval is required for each change. It cannot currently reschedule an existing event, place a call, scan iPhone Messages history, or operate arbitrary external services.
- Task dates, time zones, multiple daily brief times, and three brief formats: chronological, grouped by work/home/family/personal, essentials.
- SMS through a configured Twilio number, restricted to the owner's configured personal number. Incoming commands use the same proposal engine; approval uses a short action-specific code. Messages have no hidden authority to change a recipient or action after approval.
- Provider keys stay on the server; refresh/access tokens are encrypted in SQLite. Sessions are HttpOnly and SameSite, secure over HTTPS. State-changing browser requests require the configured origin and a custom header. OAuth uses state bound to the login session plus PKCE; tokens never go to browser storage.
- Pending actions expire in 30 minutes. A claimed action cannot execute twice. Unknown external outcomes are marked uncertain rather than retried automatically.
- Scheduled briefs deduplicate by local date/time slot. The built-in scheduler requires the server to stay running. It refreshes calendars before sending. SMS success currently means the provider accepted a request, not that the phone received it.

## Important limits of the personal server

This is an initial single-user implementation, not a production multi-customer service. Anyone with the personal password shares the same profile and data. Do not distribute that password to customers. Do not put the `.data` directory, `.env`, service keys, or participant exports in static hosting or source control.

The server stores tasks, email snippets, and chat history in plaintext SQLite; OAuth tokens alone are application-encrypted. Use a host with encrypted storage, access controls, and encrypted backups. Keep the encryption key backed up separately. This release does not implement account export/deletion, durable distributed jobs, billing, admin support, automated key rotation, full audit logs, or external security review.

Refresh connected Google data with **Refresh** in Next 24 hours after connecting. A connection being configured does not prove sync, AI, or SMS works. Existing caches are retained after a failed refresh; the UI shows a warning when refresh is incomplete. The assistant must not be relied on for emergency or guaranteed-time-critical reminders.

SMS messages are capped at 1,500 characters and can span multiple billable segments. The scheduler runs only in the scheduled minute; a server outage can miss a slot. Ambiguous network outcomes are not auto-retried. Monitor the provider logs and the app messages. A production version needs a durable queue, delivery callbacks, and a visible delivery history.

## Checks

Run `node --test tests/*.test.mjs`. Tests cover local-time conversion, daylight-saving gaps/ambiguities, view boundaries, email-header injection, token encryption/tampering, proposal approval/deduplication/expiration, unknown targets, ambiguous accounts, signature verification, scheduled-brief deduplication, STOP, login/logout, origin restrictions, path traversal, and all-day calendar time zones. Provider and SMS tests use explicit mocks; no live calls or emails/texts are sent by the tests.

Browser QA checked the welcome flow, scripted appointment/date proposal, approval, task flow, email triage, brief preview, and responsive interface locally. See the work report for any outstanding checks. Live OAuth, model calls, SMS acceptance, and actual delivery still require your credentials and device testing.

## Sharing the demo

Upload only the contents of `public/` or the prepared demo ZIP to a static host. Leave `runtime.js` set to `LIVE_SERVER = false`. Uploading the static demo does not deploy the personal server. To update the current Netlify site, deploy to its existing project from your account; using an anonymous Drop again creates a separate site. The source includes a container definition for deploying the personal backend on a host with HTTPS and a persistent `/app/.data` volume.

## Course context

This is preparation for concept and behavior testing, not evidence that the app reduces pain or that participants will pay. The interface responds to the student's revised assistant-first concept. Record actual participant reactions and objections separately. *Before You Build*, “Testing Solutions,” PDF pp. 2–4, distinguishes customer validation from whether a mechanism works. No new interviews, reactions, or validation results have been fabricated.
