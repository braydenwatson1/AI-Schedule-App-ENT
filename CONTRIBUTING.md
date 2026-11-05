# Development notes

## Keep the two modes honest

The static preview is deliberately fictional. No real accounts connect and no messages are sent. The private Node server has integration code that requires the developer's own service accounts and credentials. Keep all mode labels and approval boundaries accurate after changes.

## Basic workflow

1. Use Node.js 24 or later.
2. Start the demo with `node server/preview.mjs` and open http://localhost:4174.
3. Edit HTML/CSS/JavaScript under `public/`. Use `server/` for backend changes.
4. Run `node build-demo.mjs` after frontend changes to regenerate `public/standalone.html`.
5. Run `node --test tests/*.test.mjs`. Provider tests use mocks; passing them does not prove a live service works.
6. Check relevant browser flows on desktop and phone sizes, then commit and open a pull request.

Avoid adding a new framework or dependencies unless the change warrants it. The project currently has no runtime package dependencies. Never hand-edit the generated standalone page.

## Secrets and data

`.env` and `.data/` are ignored. `.env.example` contains blank configuration placeholders and belongs in source control. Exclude real tokens, messages, participant files, database files, API keys, passwords, and phone numbers from commits and screenshots.

All external changes need approval of the exact target and operation. Email and calendar content are untrusted input. Keep recipient validation, CSRF checks, OAuth session binding, webhook signatures, and action idempotency when extending the backend.

## Current unfinished work

Live Google/AI/SMS credentials and delivery still need end-to-end verification. Only primary Google calendars are supported. Microsoft, iCloud, existing iPhone text-history access, phone calls, editing an existing appointment's time, shared customer accounts, billing, and production delivery queues are not implemented. The demo examples are scripted and should not be mistaken for general-purpose AI behavior.
