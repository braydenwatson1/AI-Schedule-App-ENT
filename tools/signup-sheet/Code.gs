// Google Apps Script for the Wizard of Oz "notify me" signups.
// Paste this into the Google Sheet's Extensions > Apps Script editor and deploy it as a web app.
// Each signup from the demo becomes one row: Submitted at | Email | Phone | Source | Name.
// (Name is the last column so rows saved before it was added still line up.)
// See README.md in this folder for the setup steps.

const SHEET_NAME = ''; // Leave blank to use the first tab, or enter a tab name such as 'Signups'.

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = SHEET_NAME ? book.getSheetByName(SHEET_NAME) : book.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(['Submitted at', 'Email', 'Phone', 'Source', 'Name']);
    else if (!sheet.getRange(1, 5).getValue()) sheet.getRange(1, 5).setValue('Name');
    const params = (e && e.parameter) || {};
    const contact = String(params.contact || '').trim().slice(0, 120);
    if (!contact) return reply('missing contact');
    const isEmail = contact.indexOf('@') !== -1;
    // A leading = + - or @ would be read as a formula, so store it as plain text.
    const safe = value => (/^[=+\-@]/.test(value) ? "'" + value : value);
    const name = String(params.name || '').trim().slice(0, 80);
    sheet.appendRow([new Date(), isEmail ? safe(contact) : '', isEmail ? '' : safe(contact), String(params.source || 'demo').slice(0, 40), safe(name)]);
    return reply('ok');
  } finally {
    lock.releaseLock();
  }
}

function reply(text) {
  return ContentService.createTextOutput(text);
}
