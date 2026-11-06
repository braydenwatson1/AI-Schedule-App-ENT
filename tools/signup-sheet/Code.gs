/**
 * @OnlyCurrentDoc
 *
 * Google Apps Script for the Wizard of Oz "notify me" signups.
 * Paste this into the Google Sheet's Extensions > Apps Script editor and deploy it as a web app.
 * Each signup from the demo becomes one row: Submitted at | Email | Phone | Source | Name.
 * (Name is the last column so rows saved before it was added still line up.)
 * See README.md in this folder for the setup steps.
 *
 * Safety measures:
 * - @OnlyCurrentDoc limits the script to this one spreadsheet. It can't open your other Drive files or Gmail.
 * - It only ever appends rows. There is no doGet, and it never reads back or returns your data.
 * - It checks a shared token, a hidden "honeypot" field, and the format and length of every field.
 * - A leading = + - @ can't start a formula.
 * - Rate limits: at most 20 signups a minute and 500 a day. Repeats of the same contact within 6 hours are ignored.
 */

const SHEET_NAME = ''; // Leave blank to use the first tab, or enter a tab name such as 'Signups'.
const SIGNUP_TOKEN = 'DlgpyfVQUFEirVRi'; // Must match SIGNUP_TOKEN in public/app.js.
const MAX_PER_MINUTE = 20;
const MAX_PER_DAY = 500;
const SOURCES = ['chat popup', 'welcome page', 'next 24 hours tab', 'daily brief tab', 'email tab', 'connections tab'];

function doPost(e) {
  const params = (e && e.parameter) || {};
  // Anything that fails a check is quietly discarded, so bots learn nothing.
  if (params.token !== SIGNUP_TOKEN) return reply('ok');
  if (params.website) return reply('ok'); // Honeypot: real visitors never fill this in.

  const contact = clean(params.contact, 120, /^[=\-@\s]+/);
  const name = clean(params.name, 60, /^[=+\-@\s]+/);
  const source = SOURCES.indexOf(params.source) !== -1 ? params.source : 'other';
  const isEmail = /^[^\s@+]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const digits = contact.replace(/\D/g, '');
  const isPhone = !isEmail && /^\+?[\d\s().-]+$/.test(contact) && digits.length >= 10 && digits.length <= 15;
  if (!isEmail && !isPhone) return reply('ok');

  const cache = CacheService.getScriptCache();
  const contactKey = 'c:' + (isEmail ? contact.toLowerCase() : digits);
  const minuteKey = 'm:' + Math.floor(Date.now() / 60000);
  const dayKey = 'd:' + new Date().toISOString().slice(0, 10);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply('busy');
  try {
    if (cache.get(contactKey)) return reply('ok');
    const perMinute = Number(cache.get(minuteKey) || 0);
    const perDay = Number(cache.get(dayKey) || 0);
    if (perMinute >= MAX_PER_MINUTE || perDay >= MAX_PER_DAY) return reply('ok');
    cache.put(minuteKey, String(perMinute + 1), 120);
    cache.put(dayKey, String(perDay + 1), 21600);
    cache.put(contactKey, '1', 21600);

    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = (SHEET_NAME && book.getSheetByName(SHEET_NAME)) || book.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(['Submitted at', 'Email', 'Phone', 'Source', 'Name']);
    else if (!sheet.getRange(1, 5).getValue()) sheet.getRange(1, 5).setValue('Name');
    // The leading apostrophe keeps a phone number like "+1 555..." as text instead of a formula.
    sheet.appendRow([new Date(), isEmail ? contact : '', isPhone ? "'" + contact : '', source, name]);
    return reply('ok');
  } finally {
    lock.releaseLock();
  }
}

// Removes control characters, trims, cuts to length, and strips leading characters that would start a formula.
function clean(value, max, leading) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max).replace(leading, '');
}

function reply(text) {
  return ContentService.createTextOutput(text);
}
