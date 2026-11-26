/**
 * WorkPulse storage backend — Google Apps Script web app.
 *
 * Stores every work log as one row in the "WorkEntries" tab of the
 * spreadsheet this script is attached to. Free: runs on your Google account.
 *
 * Setup (5 minutes) — see docs/GOOGLE_SHEETS_SETUP.md:
 *   1. Open your Google Sheet → Extensions → Apps Script, paste this file.
 *   2. Project Settings → Script Properties → add API_SECRET = <long random text>.
 *   3. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
 *   4. Put the /exec URL in GOOGLE_SCRIPT_URL and the secret in GOOGLE_SCRIPT_SECRET.
 *
 * Every request must carry the secret, so only your WorkPulse server can use it.
 */

var SHEET_NAME = 'WorkEntries';
var HEADERS = [
  'id', 'workDate', 'userName', 'userEmail', 'projectName', 'taskDescription',
  'hoursSpent', 'status', 'priority', 'remarks', 'simulationCategory',
  'simulationWorkedNumber', 'simulationTestedNumber', 'isCarriedForward',
  'createdAt', 'updatedAt'
];
var TEXT_COLUMNS = ['id', 'workDate', 'userName', 'userEmail', 'projectName', 'taskDescription',
  'status', 'priority', 'remarks', 'simulationCategory', 'createdAt', 'updatedAt'];

function doGet() {
  return json_({ ok: true, service: 'WorkPulse', message: 'Use POST with your secret.' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Body must be JSON.' });
  }

  var expected = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expected) return json_({ ok: false, error: 'API_SECRET is not set in Script Properties.' });
  if (body.secret !== expected) return json_({ ok: false, error: 'Unauthorized: wrong secret.' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'Sheet is busy, please retry.' });
  }

  try {
    var sheet = getSheet_();
    switch (body.action) {
      case 'ping':
        return json_({ ok: true, sheetName: SHEET_NAME, count: Math.max(sheet.getLastRow() - 1, 0),
          spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
      case 'list':
        return json_({ ok: true, entries: readAll_(sheet) });
      case 'create':
        return json_({ ok: true, entry: create_(sheet, body.entry) });
      case 'update':
        return json_({ ok: true, entry: update_(sheet, body.entry) });
      case 'delete':
        remove_(sheet, body.id);
        return json_({ ok: true });
      case 'import':
        return json_(import_(sheet, body.entries || [], body.mode === 'replace' ? 'replace' : 'append'));
      default:
        return json_({ ok: false, error: 'Unknown action: ' + body.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- helpers ----------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Store text columns as plain text so Sheets never turns "2026-01-02" into a Date
    // or "=..." into a formula.
    TEXT_COLUMNS.forEach(function (name) {
      var col = HEADERS.indexOf(name) + 1;
      sheet.getRange(1, col, sheet.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  return sheet;
}

/** Prevents spreadsheet formula injection: text starting with = + - @ is stored literally. */
function safeText_(value) {
  var s = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function toRow_(entry) {
  return HEADERS.map(function (h) {
    var v = entry[h];
    if (h === 'hoursSpent') return Number(v) || 0;
    if (h === 'simulationWorkedNumber' || h === 'simulationTestedNumber') return v ? Number(v) : '';
    if (h === 'isCarriedForward') return v === true;
    return safeText_(v);
  });
}

function formatDate_(v, pattern) {
  return Utilities.formatDate(v, Session.getScriptTimeZone(), pattern);
}

function fromRow_(row) {
  var e = {};
  HEADERS.forEach(function (h, i) {
    var v = row[i];
    if (v instanceof Date) {
      v = h === 'workDate' ? formatDate_(v, 'yyyy-MM-dd') : v.toISOString();
    } else if (typeof v === 'string' && /^'[=+\-@]/.test(v)) {
      v = v.substring(1);
    }
    e[h] = v;
  });
  e.id = String(e.id);
  e.hoursSpent = Number(e.hoursSpent) || 0;
  e.isCarriedForward = e.isCarriedForward === true || e.isCarriedForward === 'TRUE' || e.isCarriedForward === 'true';
  e.simulationWorkedNumber = e.simulationWorkedNumber === '' ? undefined : Number(e.simulationWorkedNumber);
  e.simulationTestedNumber = e.simulationTestedNumber === '' ? undefined : Number(e.simulationTestedNumber);
  if (!e.remarks) delete e.remarks;
  if (!e.simulationCategory) delete e.simulationCategory;
  return e;
}

function readAll_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return rows
    .filter(function (r) { return r[0] !== '' && r[0] !== null; })
    .map(fromRow_)
    .sort(function (a, b) {
      return a.workDate === b.workDate ? (a.createdAt < b.createdAt ? 1 : -1) : (a.workDate < b.workDate ? 1 : -1);
    });
}

function findRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function validate_(entry) {
  if (!entry || !entry.id) throw new Error('Entry must have an id.');
  if (!entry.workDate) throw new Error('Entry must have a workDate.');
}

function create_(sheet, entry) {
  validate_(entry);
  if (findRow_(sheet, entry.id) !== -1) throw new Error('An entry with this id already exists.');
  sheet.appendRow(toRow_(entry));
  return entry;
}

function update_(sheet, entry) {
  validate_(entry);
  var row = findRow_(sheet, entry.id);
  if (row === -1) throw new Error('Entry not found. It may have been deleted.');
  var existing = fromRow_(sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0]);
  entry.createdAt = existing.createdAt || entry.createdAt;
  sheet.getRange(row, 1, 1, HEADERS.length).setValues([toRow_(entry)]);
  return entry;
}

function remove_(sheet, id) {
  var row = findRow_(sheet, id);
  if (row === -1) throw new Error('Entry not found. It may have been deleted.');
  sheet.deleteRow(row);
}

function import_(sheet, entries, mode) {
  if (mode === 'replace' && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
  }
  var existing = {};
  var last = sheet.getLastRow();
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r, i) {
      if (r[0] !== '') existing[String(r[0])] = i + 2;
    });
  }
  var newRows = [];
  var updated = 0;
  entries.forEach(function (entry) {
    validate_(entry);
    var row = existing[String(entry.id)];
    if (row) {
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([toRow_(entry)]);
      updated++;
    } else {
      newRows.push(toRow_(entry));
      existing[String(entry.id)] = -1;
    }
  });
  if (newRows.length) {
    // After a "replace" the old rows are blank; write from row 2 so no gaps remain.
    var start = mode === 'replace' ? 2 : sheet.getLastRow() + 1;
    sheet.getRange(start, 1, newRows.length, HEADERS.length).setValues(newRows);
  }
  if (mode === 'replace') {
    var total = newRows.length + 1;
    if (sheet.getLastRow() > total) sheet.deleteRows(total + 1, sheet.getLastRow() - total);
  }
  return { ok: true, added: newRows.length, updated: updated, total: Math.max(sheet.getLastRow() - 1, 0) };
}
