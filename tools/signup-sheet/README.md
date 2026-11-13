# Signup sheet for the Wizard of Oz test

The demo's "Get notified when we go live" spots (the chat card, the welcome-page checkbox, and the box at the bottom of the Next 24 hours, Daily brief, Email and Connections tabs) send each name and email or phone number to a Google Sheet through a small Google Apps Script web app. The demo is a static page, so it can't write to an Excel file directly. You can download the Google Sheet as Excel at any time with File > Download > Microsoft Excel.

## Setup or update (about 5 minutes)

1. Open the Google Sheet that should collect signups.
2. Choose **Extensions > Apps Script**.
3. Replace all of the code with everything from `Code.gs`, and click **Save**.
4. First time: click **Deploy > New deployment**, click the gear next to "Select type", and choose **Web app**. To update an existing deployment, click **Deploy > Manage deployments**, click the pencil, and set Version to **New version**.
5. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy**.
6. Google may ask you to authorize the script again. Because of `@OnlyCurrentDoc`, it only asks for access to this one spreadsheet. If you see "Google hasn't verified this app", click **Advanced**, then **Go to (project name)**.
7. First time only: copy the **Web app URL**, which ends in `/exec`, into `SIGNUP_ENDPOINT` near the top of `public/app.js`, then run `node build-demo.mjs`. A new version keeps the same URL.

`SIGNUP_TOKEN` in `Code.gs` must match `SIGNUP_TOKEN` in `public/app.js`. Publish the site change before deploying a script that checks a new token. Otherwise signups from the live page get discarded.

The signup tab's columns are: Submitted at, Email, Phone, Source, Name, Visitor.

## Demo stats (visitors, pages, signup rate)

The same script also counts anonymous page views, so the signup rate can be worked out in one place. After the first visit following an update, two tabs appear on their own:

- **Visits**: one row each time a visitor opens a page for the first time in a browser tab: Time, Visitor (a random ID), Page, and Came from (an ad link's `utm_source`, another website's name, or `direct`).
- **Stats**: formulas that update by themselves. Total visitors, visitors who signed up, the signup rate, unique visitors on each page (Welcome, Personal assistant, Next 24 hours, Daily brief, Email, Connections, Build & setup guide), signups by where they signed up, and visitors by where they came from.

How it counts:

- A visitor is one browser. Clicking **Start over** counts the next person as a new visitor, which suits handing a laptop between testers.
- Signups made before stats tracking started have no Visitor ID, so they appear in "All signups, including ones before tracking" but not in the signup rate.
- Open the demo once with `?notrack` at the end of the address (for example `https://thebalancingact.app/?notrack`) on each of your own browsers so your testing isn't counted. `?track` turns counting back on.
- For ads, add `?utm_source=facebook` (or `instagram`, and so on) to the ad's link to see how many visitors each one brings.
- If the Stats tab gets deleted or broken, open Apps Script, choose `rebuildStats` in the function menu, and click **Run**.

Page views never include names, contact details, or chat text. The Visitor ID on a signup row links that person's page views to their signup, which is what makes the per-person signup rate possible.

## What protects your account

- `@OnlyCurrentDoc` limits the script to this one spreadsheet. It can't read your other Drive files, Gmail, or anything else in your account.
- The script only appends rows. It has no `doGet` and never returns sheet data, so the public URL can't be used to read your signups.
- Each request needs the shared token and an empty honeypot field. The email or phone number must look valid, and every field has a length limit. A leading `= + - @` can't start a formula.
- It accepts at most 20 signups a minute and 500 a day, and it ignores the same contact again within 6 hours.
- Page views only accept a page name from a fixed list and a short random ID, and are capped at 300 a minute and 20,000 a day.

Limits to know about: the token is visible in the public page's code, so it only stops casual bots, not someone determined. "Anyone" access means the URL can still receive junk. The worst it can do is add rows, which you can delete.

For more separation, create a separate Google account just for this project (for example, a "balancing act" Gmail). Own the sheet and the script there, and share the sheet with your personal account as a viewer or editor. Then the script never runs as your personal account.

## Notes

- If you edit `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the same URL keeps working.
- Testers' contact details go to the sheet owner's Google account. Tell testers what the email or number is for, and delete the sheet when the test is over if you no longer need it.
