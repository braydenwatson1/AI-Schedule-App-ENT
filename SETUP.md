# Your iPhone version, then a product people can buy

The interface and the personal-server implementation are built. No paid account was opened, API key created, Google inbox connected, phone number purchased, email sent, or text sent during development. The existing public calendar prototype remains at https://frolicking-cendol-811864.netlify.app/; it has not automatically become this rebuild.

## A. Try the fake interface now

Open `public/standalone.html`. It works by double-clicking the file. Choose **Just show me the demo** or enter a fictional first name. Try these in Assistant:

- “Next Tuesday at 11 I have a dentist.” Review the date and approve the fictional event.
- “Remind me to shop for detergent tomorrow.” Review and approve the task.
- “Draft an email to my dentist.” Review the fictional address and exact message.
- Open Email, check off the fictional waiver, and try different Daily Brief layouts and times.

The demo supports these examples and related simple prompts; it is not a general AI chatbot. The static demo can be publicly hosted without exposing any real account. Public visitors each get their own browser-local demo state.

## B. Use it personally on your iPhone with Google/Gmail

You need five things. You do not need to incorporate a business or release through the App Store just to run your personal web app.

### 1. A small always-on server with HTTPS and persistent storage

Use a host that runs a Node.js 24 process or the included Docker container. Set `HOST=0.0.0.0` there; set `APP_ORIGIN` to the actual HTTPS origin, with no trailing slash or path. Mount a persistent directory at `/app/.data` for Docker. A local computer is useful for testing but cannot send scheduled briefs while asleep. A static Netlify Drop upload serves the demo only; it does not run this Node server or preserve SQLite.

For local development: copy `.env.example` to `.env`, set `PERSONAL_PASSWORD` (at least 16 characters), and generate `TOKEN_ENCRYPTION_KEY` with the command in the example file. Run:

```
node --env-file=.env server/index.mjs
```

Open the exact `APP_ORIGIN` value (default http://localhost:4174), sign in with the private password, and complete the welcome form. Keep `.env` out of source control. Never paste secrets into the public demo, a chat message, or a frontend configuration file.

### 2. Your Google connection

Create a Google Cloud project and enable **Gmail API** and **Google Calendar API**. Configure the OAuth consent screen, start with your own address as a test user, and create a **Web application** OAuth client. Register the callback exactly:

```
http://localhost:4174/auth/google/callback
```

For the hosted server, also register `https://YOUR-ACTUAL-HOST/auth/google/callback`. Put the client ID and client secret in the server environment. Each connected account grants `openid email` plus either `calendar.events` or `gmail.modify`, depending on the connection you choose. The Gmail permission enables reading snippets, marking read, sending after approval, and moving selected messages to Trash; permanent deletion is not implemented. The calendar connection covers primary calendars, one per Google account.

In the app, connect Google Calendar and Google email separately. Then use **Next 24 hours → Refresh**. Check actual events and messages against Google before trying any write. Testing-mode Google grants can expire after seven days; reconnect when needed. Google documents personal-use exceptions to verification, but a public commercial app has different requirements. Follow the current policy rather than treating a test-user setup as a production launch.

Sources: [Google OAuth testing expiration](https://support.google.com/cloud/answer/15549945), [restricted scope verification and exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Calendar event API](https://developers.google.com/workspace/calendar/api/v3/reference).

### 3. An AI API account

Create an API project with your chosen provider. This implementation currently supports the **OpenAI Responses API**. Set `OPENAI_API_KEY` and `OPENAI_MODEL` on the server. Choose a currently available text model supporting structured outputs; the model is deliberately configurable rather than hard-coded. Set usage limits in the provider account before testing.

When you chat, the model receives your current request, up to ten recent messages, tasks, a limited calendar snapshot, and recent email headers/snippets. It does not receive OAuth tokens or the personal login password. The server requests no stored response (`store:false`); review the provider's actual data policies separately. An API key enables real model requests; without it the personal server gives a setup error and never silently substitutes a scripted reply.

Source: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

### 4. A number for two-way texting

Create a Twilio project, obtain an SMS-capable number appropriate to your country, and configure its incoming-message webhook as:

```
https://YOUR-ACTUAL-HOST/webhooks/twilio
```

Use HTTP POST. Set the account SID, auth token, sender number, `PERSONAL_PHONE` (your own controlled, verified number in +countrycode format), and `SMS_ENABLED=true` on the server. Complete applicable sender approval. US local-number application messaging uses A2P 10DLC registration; other sender types have their own requirements. Trial accounts also have provider restrictions. Do not treat a phone number typed into the welcome survey as verified ownership.

Enter that same personal number in your profile, select **Text my briefs to my phone**, choose a nearby time in your time zone, and save. Confirm actual receipt. Text a harmless task to the assistant number, check the proposed date, and reply with the exact `APPROVE` code. Reply STOP and verify later briefs are paused. Use provider logs to distinguish accepted, delivered, failed, and filtered messages. Signing in from another iPhone does not change the server's approved recipient.

The number is a new assistant conversation. It cannot automatically read the history of your personal iPhone SMS or iMessage conversations. Calling businesses is not implemented.

Sources: [Twilio A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc), [Twilio webhook security](https://www.twilio.com/docs/usage/security).

### 5. Put it on your phone

Open the hosted HTTPS address in Safari on your iPhone. Sign in, then use **Share → Add to Home Screen**. The app includes a web app manifest. This gives you a Home Screen app experience while the server handles Google and SMS. Safari itself does not need to stay open for server-sent texts. The server must stay running.

Source: [Apple iPhone Safari guidance](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios).

### Personal test sequence

Connect only your own Google account first. Add one test appointment and compare it in Google Calendar. Add a tomorrow task and confirm it survives signing out and back in. Send a short test email to yourself only after reviewing its exact recipient and text. Test one brief, one SMS reply, STOP, and reconnecting a revoked account. Record real failures. Live delivery, OAuth credentials, and model requests have not yet been verified in this workspace.

## C. Offer it as a public app you can sell

The current server is for one owner. A sellable service requires a further implementation and launch phase; sharing its personal password would expose the same account and data to everyone.

1. **Customer accounts and isolation.** Add production authentication, secure account recovery, phone verification, and per-user authorization for every task, message, token, proposed action, webhook, scheduled job, and database query. Replace the personal-number allowlist with verified, consented user-to-number mapping. Test that user A cannot read or act on user B's data. Move to a managed database and proper secrets management as needed.
2. **Google approval and limited permissions.** Establish a domain, accurate branding, privacy disclosures, and the required OAuth verification. Request only necessary scopes. Public server processing of restricted Gmail data can require a security assessment; get the applicable requirements and costs before promising launch dates. Personal testing and commercial approval are separate.
3. **Messaging that is approved and dependable.** Register the correct sender/use case, maintain consent and opt-out records, handle inbound signatures and delivery callbacks, and protect against SMS abuse. Add durable jobs, idempotency, safe retries, catch-up rules, time-zone changes, delivery history, alerting, and rate/spend limits. SMS provider acceptance does not prove delivery.
4. **Reliable account synchronization.** Add incremental sync, calendar selection beyond primary, paginated email backfills, Google push/watch renewals, change reconciliation, email-to-task extraction with source links, and deduplication. Keep human approval for sending, deleting, or canceling. Add robust tests for misleading email content, ambiguous dates, recurring events, attendee changes, and partial failures.
5. **Payments and customer operations.** Add subscriptions, server-verified payment webhooks, access changes when subscriptions end, invoices, refund/cancellation handling, and a way to contact support. Define a plan around measured costs: hosting/storage + AI usage + number rental + SMS segments/carrier charges + payment processing + any required provider reviews. A guessed flat API bill is not a reliable pricing basis.
6. **A launch-ready data policy and operations plan.** Decide retention, customer export and deletion, backup restoration, incident handling, audit trails, and staff access. Review privacy, consumer, messaging, and commercial requirements for the markets you intend to serve with qualified help. This document is an implementation guide, not a legal determination.
7. **A small real beta before broad sales.** Recruit consenting adults, observe whether the service actually reduces their remembering and coordination work, track failures and return use, and test willingness to pay. Build the providers they use. Microsoft, iCloud, and calling each need a separate integration and verification effort. There is no universal “connect everything” API in this build.

You can sell a web app without first building an App Store version. If you later choose native iOS distribution, plan an additional native implementation/review phase and check the App Store rules that apply to your business model then.

## What I would do next for this project

Use the demo to settle the interface. Then connect your private Google account and AI key, verify one appointment and one task end to end, and add SMS only after that works. Keep the public concept demo separate from the private account-connected service. Choose the public beta scope and provider approvals after learning from that personal use.
