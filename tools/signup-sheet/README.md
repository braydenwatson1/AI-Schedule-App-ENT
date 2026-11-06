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

The sheet's columns are: Submitted at, Email, Phone, Source, Name.

## What protects your account

- `@OnlyCurrentDoc` limits the script to this one spreadsheet. It can't read your other Drive files, Gmail, or anything else in your account.
- The script only appends rows. It has no `doGet` and never returns sheet data, so the public URL can't be used to read your signups.
- Each request needs the shared token and an empty honeypot field. The email or phone number must look valid, and every field has a length limit. A leading `= + - @` can't start a formula.
- It accepts at most 20 signups a minute and 500 a day, and it ignores the same contact again within 6 hours.

Limits to know about: the token is visible in the public page's code, so it only stops casual bots, not someone determined. "Anyone" access means the URL can still receive junk. The worst it can do is add rows, which you can delete.

For more separation, create a separate Google account just for this project (for example, a "balancing act" Gmail). Own the sheet and the script there, and share the sheet with your personal account as a viewer or editor. Then the script never runs as your personal account.

## Notes

- If you edit `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the same URL keeps working.
- Testers' contact details go to the sheet owner's Google account. Tell testers what the email or number is for, and delete the sheet when the test is over if you no longer need it.
