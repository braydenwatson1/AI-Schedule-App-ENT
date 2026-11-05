# Open this project with your AI

This is the **assistant-first** version of The Balancing Act. The older calendar-first prototype is not included. The intended product is a personal assistant that collects context from connected accounts, helps with plans and tasks through chat, and sends configurable daily briefs.

## Preview in a minute

- Download the repository ZIP and extract it, or clone the repository.
- Open `public/standalone.html` in a browser. On Windows you can also double-click `Open Demo.cmd`.
- To edit with live source files, install Node.js 24 or later, then run `node server/preview.mjs`. Open http://localhost:4174 and reload after changes. No package installation or API credentials are needed for the demo.

## A prompt for your AI

> Read README.md, FRIEND-START-HERE.md, CONTRIBUTING.md, and SETUP.md before editing. This app has a fictional browser-local concept demo and a separate single-user Node backend. I want to change [describe your changes]. Keep those modes clearly distinguished. Change source files, rebuild the standalone demo with node build-demo.mjs, and run node --test tests/*.test.mjs. Don't claim Google, AI, or SMS works live unless we actually configure and test those services.

## Where changes go

- `public/index.html` — onboarding, dashboard, navigation, forms.
- `public/style.css` — desktop and phone layout.
- `public/app.js` — interface behavior, demo state, and API calls.
- `public/domain.js` — shared dates, action validation, brief formats, and scripted demo examples.
- `public/runtime.js` — static demo mode. The Node server serves its own live-mode response for this URL.
- `public/standalone.html` — generated single-file demo; rebuild rather than editing it directly.
- `server/` — private login, SQLite, Google OAuth, provider adapters, approval execution, and SMS.
- `tests/` — local checks with mocked provider calls.

## Work together

Use a branch for each change, push it, and open a pull request so the other person can review it. Pull the latest shared branch before starting another change. Each developer uses their own ignored `.env` for private credentials; never copy keys into the demo, a prompt, or a commit.

## Public previews that follow changes

The repository includes `netlify.toml`. In the Netlify project, connect this GitHub repository to continuous deployment. It builds with `node build-demo.mjs` and publishes `public/`. Changes pushed to the configured production branch update that demo after a successful deploy. Enable/configure Deploy Previews in Netlify if you want a preview for pull requests.

That setup must be connected in the owner's Netlify account; this file alone does not enable hosting. The existing anonymous/manual Netlify deployment does not automatically follow GitHub commits. Static Netlify previews never run the private Node backend or connect real user accounts.

For the real personal service, follow SETUP.md and deploy the Node backend to an HTTPS host with persistent storage. The current backend is single-user and is not safe to distribute as a shared multi-customer service.
