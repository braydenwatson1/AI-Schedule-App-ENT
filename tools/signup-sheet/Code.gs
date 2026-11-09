/**
 * @OnlyCurrentDoc
 *
 * Google Apps Script for the Wizard of Oz "notify me" signups and the demo's anonymous page-view stats.
 * Paste this into the Google Sheet's Extensions > Apps Script editor and deploy it as a web app.
 * Each signup from the demo becomes one row on the first tab: Submitted at | Email | Phone | Source | Name | Visitor.
 * (New columns go on the end so rows saved before they were added still line up.)
 * Each page a visitor opens becomes one row on the "Visits" tab: Time | Visitor | Page | Came from.
 * The "Stats" tab is created automatically and counts visitors, visitors per page, and the signup rate.
 * See README.md in this folder for the setup steps.
 *
 * Safety measures:
 * - @OnlyCurrentDoc limits the script to this one spreadsheet. It can't open your other Drive files or Gmail.
 * - It only ever appends rows. There is no doGet, and it never reads back or returns your data.
 * - It checks a shared token, a hidden "honeypot" field, and the format and length of every field.
 * - A leading = + - @ can't start a formula.
 * - Rate limits: at most 20 signups a minute and 500 a day, and 300 page views a minute and 20,000 a day.
 *   Repeats of the same contact within 6 hours are ignored.
 * - Page views carry only a random visitor ID, a page name from a fixed list, and where the visit came from
 *   (an ad's utm_source or a website name). No names, contacts or chat text.
 */

const SHEET_NAME = ''; // Leave blank to use the first tab, or enter a tab name such as 'Signups'.
const SIGNUP_TOKEN = 'DlgpyfVQUFEirVRi'; // Must match SIGNUP_TOKEN in public/app.js.
const MAX_PER_MINUTE = 20;
const MAX_PER_DAY = 500;
const MAX_VIEWS_PER_MINUTE = 300;
const MAX_VIEWS_PER_DAY = 20000;
const SOURCES = ['chat popup', 'welcome page', 'next 24 hours tab', 'daily brief tab', 'email tab', 'connections tab'];
const VISITS_SHEET = 'Visits';
const STATS_SHEET = 'Stats';
// Page names the demo sends, and how the Stats tab labels them.
const PAGES = [
  ['welcome', 'Welcome (home) page'],
  ['assistant', 'Personal assistant'],
  ['calendar', 'Next 24 hours'],
  ['brief', 'Daily brief'],
  ['email', 'Email'],
  ['connections', 'Connections'],
  ['setup', 'Build & setup guide'],
];
const SOURCE_LABELS = {
  'chat popup': 'Personal assistant chat',
  'welcome page': 'Welcome page checkbox',
  'next 24 hours tab': 'Next 24 hours tab',
  'daily brief tab': 'Daily brief tab',
  'email tab': 'Email tab',
  'connections tab': 'Connections tab',
  other: 'Other',
};
const VISITOR_PATTERN = /^[a-z0-9]{10,40}$/;

function doPost(e) {
  const params = (e && e.parameter) || {};
  // Anything that fails a check is quietly discarded, so bots learn nothing.
  if (params.token !== SIGNUP_TOKEN) return reply('ok');
  if (params.kind === 'view') return logView(params);
  if (params.website) return reply('ok'); // Honeypot: real visitors never fill this in.

  const contact = clean(params.contact, 120, /^[=\-@\s]+/);
  const name = clean(params.name, 60, /^[=+\-@\s]+/);
  const source = SOURCES.indexOf(params.source) !== -1 ? params.source : 'other';
  const visitor = VISITOR_PATTERN.test(params.visitor || '') ? params.visitor : '';
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
    const sheet = signupSheet(book);
    if (sheet.getLastRow() === 0) sheet.appendRow(['Submitted at', 'Email', 'Phone', 'Source', 'Name', 'Visitor']);
    else {
      if (!sheet.getRange(1, 5).getValue()) sheet.getRange(1, 5).setValue('Name');
      if (!sheet.getRange(1, 6).getValue()) sheet.getRange(1, 6).setValue('Visitor');
    }
    // The leading apostrophe keeps a phone number like "+1 555..." as text instead of a formula.
    sheet.appendRow([new Date(), isEmail ? contact : '', isPhone ? "'" + contact : '', source, name, visitor]);
    ensureStats(book);
    return reply('ok');
  } finally {
    lock.releaseLock();
  }
}

// One anonymous page view: a random visitor ID, a page from the fixed list, and where the visit came from.
function logView(params) {
  const visitor = String(params.visitor || '');
  const page = String(params.page || '');
  if (!VISITOR_PATTERN.test(visitor)) return reply('ok');
  if (!PAGES.some(function (p) { return p[0] === page; })) return reply('ok');
  const ref = String(params.ref || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'direct';

  const cache = CacheService.getScriptCache();
  const minuteKey = 'vm:' + Math.floor(Date.now() / 60000);
  const dayKey = 'vd:' + new Date().toISOString().slice(0, 10);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply('busy');
  try {
    const perMinute = Number(cache.get(minuteKey) || 0);
    const perDay = Number(cache.get(dayKey) || 0);
    if (perMinute >= MAX_VIEWS_PER_MINUTE || perDay >= MAX_VIEWS_PER_DAY) return reply('ok');
    cache.put(minuteKey, String(perMinute + 1), 120);
    cache.put(dayKey, String(perDay + 1), 21600);

    const book = SpreadsheetApp.getActiveSpreadsheet();
    visitsSheet(book).appendRow([new Date(), visitor, page, ref]);
    ensureStats(book);
    return reply('ok');
  } finally {
    lock.releaseLock();
  }
}

function signupSheet(book) {
  return (SHEET_NAME && book.getSheetByName(SHEET_NAME)) || book.getSheets()[0];
}

// The Visits tab, added at the end so the signup tab stays first.
function visitsSheet(book) {
  let visits = book.getSheetByName(VISITS_SHEET);
  if (!visits) {
    visits = book.insertSheet(VISITS_SHEET, book.getSheets().length);
    visits.appendRow(['Time', 'Visitor', 'Page', 'Came from']);
    visits.setFrozenRows(1);
  }
  return visits;
}

// Creates the Stats tab the first time it is needed. It is all formulas, so it updates by itself.
function ensureStats(book) {
  if (book.getSheetByName(STATS_SHEET)) return;
  buildStats(book);
}

// Run this from the Apps Script editor (select rebuildStats, then Run) to recreate the Stats tab.
function rebuildStats() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const old = book.getSheetByName(STATS_SHEET);
  if (old) book.deleteSheet(old);
  buildStats(book);
}

function buildStats(book) {
  const signups = signupSheet(book);
  if (signups.getName() === STATS_SHEET || signups.getName() === VISITS_SHEET) return; // Keep the signup tab first.
  visitsSheet(book);
  const s = "'" + signups.getName().replace(/'/g, "''") + "'!";
  const v = "'" + VISITS_SHEET + "'!";
  const stats = book.insertSheet(STATS_SHEET, Math.min(1, book.getSheets().length));
  const rows = [];
  const pct = [];
  const add = function (label, formula, isPct) { rows.push([label, formula || '', '']); if (isPct) pct.push(rows.length); return rows.length; };

  add('The Balancing Act demo stats');
  add('Counts unique visitors since page tracking began. A visitor is one browser (one tester after "Start over").');
  add('');
  const total = add('Total visitors', '=COUNTUNIQUE(' + v + 'B2:B)');
  const signed = add('Visitors who signed up', '=COUNTUNIQUE(' + s + 'F2:F)');
  add('Signup rate (signed up ÷ visitors)', '=IF(B' + total + '=0,0,B' + signed + '/B' + total + ')', true);
  add('All signups, including ones before tracking', '=COUNTA(' + s + 'A2:A)');
  add('Tracking since', '=IF(COUNT(' + v + 'A2:A)=0,"",MIN(' + v + 'A2:A))');
  add('');
  const pageHead = add('Visitors by page');
  rows[pageHead - 1] = ['Visitors by page', 'Visitors', '% of all visitors'];
  PAGES.forEach(function (p) {
    const r = rows.length + 1;
    rows.push([p[1], '=COUNTUNIQUEIFS(' + v + 'B2:B,' + v + 'C2:C,"' + p[0] + '")', '=IF($B$' + total + '=0,0,B' + r + '/$B$' + total + ')']);
  });
  add('');
  const sourceHead = add('Signups by where they signed up');
  rows[sourceHead - 1] = ['Signups by where they signed up', 'Signups', '% of all visitors'];
  SOURCES.concat(['other']).forEach(function (src) {
    const r = rows.length + 1;
    rows.push([SOURCE_LABELS[src], '=COUNTUNIQUEIFS(' + s + 'F2:F,' + s + 'D2:D,"' + src + '")', '=IF($B$' + total + '=0,0,B' + r + '/$B$' + total + ')']);
  });

  stats.getRange(1, 1, rows.length, 3).setValues(rows);
  stats.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  stats.getRange(2, 1).setFontColor('#666666');
  [pageHead, sourceHead].forEach(function (r) { stats.getRange(r, 1, 1, 3).setFontWeight('bold').setBackground('#e8f0ec'); });
  stats.getRange(total, 1, 5, 1).setFontWeight('bold');
  pct.forEach(function (r) { stats.getRange(r, 2).setNumberFormat('0.0%'); });
  stats.getRange(pageHead + 1, 3, PAGES.length, 1).setNumberFormat('0.0%');
  stats.getRange(sourceHead + 1, 3, SOURCES.length + 1, 1).setNumberFormat('0.0%');
  stats.getRange(total + 4, 2).setNumberFormat('mmm d, yyyy');

  // Visitors by where they came from (ad utm_source, another website, or direct). Fills in automatically.
  stats.getRange(pageHead, 5, 1, 2).setValues([['Visitors by where they came from', 'Visitors']]).setFontWeight('bold').setBackground('#e8f0ec');
  stats.getRange(pageHead + 1, 5).setFormula('=IFERROR(SORT(UNIQUE(FILTER(' + v + 'D2:D,' + v + 'D2:D<>""))),"")');
  stats.getRange(pageHead + 1, 6).setFormula('=IFERROR(MAP(E' + (pageHead + 1) + ':E,LAMBDA(src,IF(src="","",COUNTUNIQUEIFS(' + v + 'B2:B,' + v + 'D2:D,src)))),"")');

  stats.setColumnWidth(1, 330);
  stats.setColumnWidth(2, 110);
  stats.setColumnWidth(3, 140);
  stats.setColumnWidth(5, 240);
}

// Removes control characters, trims, cuts to length, and strips leading characters that would start a formula.
function clean(value, max, leading) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max).replace(leading, '');
}

function reply(text) {
  return ContentService.createTextOutput(text);
}
