# Signup sheet for the Wizard of Oz test

The demo's "Get notified when we go live" card sends each email or phone number to a Google Sheet through a small Google Apps Script web app. The demo is a static page, so it cannot write to an Excel file directly. You can download the Google Sheet as Excel at any time (File > Download > Microsoft Excel).

## One-time setup (about 5 minutes)

1. Open the Google Sheet that should collect signups.
2. Choose **Extensions > Apps Script**.
3. Delete the starter code, paste in everything from `Code.gs`, and click **Save**.
4. Click **Deploy > New deployment**. Click the gear next to "Select type" and choose **Web app**.
5. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy**.
6. Google asks you to authorize the script. It only needs access to this spreadsheet. If you see "Google hasn't verified this app", click **Advanced**, then **Go to (project name)**.
7. Copy the **Web app URL**. It ends in `/exec`.
8. Paste it into `SIGNUP_ENDPOINT` near the top of `public/app.js`, then run `node build-demo.mjs`.

The first signup adds a header row: Submitted at, Email, Phone, Source.

## Notes

- "Anyone" access means anyone who finds the URL could add a row. The script only appends rows. It cannot read or change existing data.
- If you edit `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the same URL keeps working.
- Testers' contact details go to the sheet owner's Google account. Tell testers what the number or email is for, and delete the sheet when the test is over if you no longer need it.
