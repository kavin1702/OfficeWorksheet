// A small in-memory imitation of the Google Apps Script services that
// apps-script/Code.gs uses (SpreadsheetApp, ContentService, LockService,
// PropertiesService, Utilities, Session). It lets us run the real Code.gs
// in Node and check exactly what would land in the Google Sheet.
import fs from 'node:fs';
import vm from 'node:vm';

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) line.push(this.sheet.cell(this.row + r, this.col + c).value);
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.numRows || values.some((v) => v.length !== this.numCols)) {
      throw new Error('The number of rows/columns in the data does not match the range.');
    }
    values.forEach((line, r) => line.forEach((v, c) => this.sheet.write(this.row + r, this.col + c, v)));
    return this;
  }
  clearContent() {
    for (let r = 0; r < this.numRows; r++)
      for (let c = 0; c < this.numCols; c++) this.sheet.cell(this.row + r, this.col + c).value = '';
    return this;
  }
  setNumberFormat(fmt) {
    for (let r = 0; r < this.numRows; r++)
      for (let c = 0; c < this.numCols; c++) this.sheet.cell(this.row + r, this.col + c).format = fmt;
    return this;
  }
  setFontWeight() {
    return this;
  }
}

export class FakeSheet {
  constructor(name) {
    this.name = name;
    this.rows = []; // rows[r][c] = { value, format, formula }
    this.formulaWrites = 0;
  }
  cell(r, c) {
    while (this.rows.length < r) this.rows.push([]);
    const line = this.rows[r - 1];
    while (line.length < c) line.push({ value: '', format: this.columnFormat(line.length + 1) });
    return line[c - 1];
  }
  columnFormat(c) {
    return (this.colFormats && this.colFormats[c]) || '';
  }
  write(r, c, v) {
    const cell = this.cell(r, c);
    if (typeof v === 'string' && v.startsWith("'")) {
      cell.value = v.slice(1); // real Sheets: leading apostrophe = literal text, not stored
      return;
    }
    if (typeof v === 'string' && v.startsWith('=')) {
      this.formulaWrites++;
      cell.value = '#FORMULA_EXECUTED';
      return;
    }
    if (typeof v === 'string' && cell.format !== '@' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-').map(Number);
      cell.value = new Date(Date.UTC(y, m - 1, d)); // real Sheets turns date-like text into a Date
      return;
    }
    cell.value = v;
  }
  getLastRow() {
    for (let r = this.rows.length; r >= 1; r--) {
      if (this.rows[r - 1].some((c) => c.value !== '' && c.value !== null)) return r;
    }
    return 0;
  }
  getMaxRows() {
    return Math.max(1000, this.rows.length);
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    if (row === 1 && numRows >= 1000 && numCols === 1) {
      this.colFormats = this.colFormats || {};
    }
    const range = new FakeRange(this, row, col, numRows, numCols);
    const orig = range.setNumberFormat.bind(range);
    range.setNumberFormat = (fmt) => {
      if (numRows >= 1000) {
        this.colFormats = this.colFormats || {};
        this.colFormats[col] = fmt;
      }
      return orig(fmt);
    };
    return range;
  }
  appendRow(values) {
    const r = this.getLastRow() + 1;
    values.forEach((v, i) => this.write(r, i + 1, v));
  }
  deleteRow(r) {
    this.rows.splice(r - 1, 1);
  }
  deleteRows(r, n) {
    this.rows.splice(r - 1, n);
  }
  setFrozenRows() {}
  /** Plain values as they would show in the Google Sheet UI. */
  toTable() {
    const last = this.getLastRow();
    const width = this.rows[0] ? this.rows[0].length : 0;
    return this.rows.slice(0, last).map((line) =>
      Array.from({ length: width }, (_, i) => {
        const v = line[i] ? line[i].value : '';
        return v instanceof Date ? v.toISOString().slice(0, 10) : v;
      })
    );
  }
}

export function createRuntime(codePath, { secret }) {
  const sheets = new Map();
  const spreadsheet = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => {
      const s = new FakeSheet(n);
      sheets.set(n, s);
      return s;
    },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/FAKE_TEST_SHEET/edit'
  };
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'API_SECRET' ? secret : null) }) },
    Session: { getScriptTimeZone: () => 'UTC' },
    Utilities: {
      formatDate: (d, _tz, _pattern) => d.toISOString().slice(0, 10)
    },
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), context, { filename: 'Code.gs' });
  return {
    doPost: (contents) => context.doPost({ postData: { contents } }).text,
    doGet: () => context.doGet().text,
    sheet: () => sheets.get('WorkEntries')
  };
}
