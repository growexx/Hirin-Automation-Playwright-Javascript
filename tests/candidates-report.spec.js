import { test, expect } from '@playwright/test';
import path from 'path';
import XLSX from 'xlsx';

const CLIENT_NAME = 'Growexx';
const LOGIN_URL = 'https://stgapp.hirin.ai/login';
const CREDENTIALS = { email: 'superadmin@yopmail.com', password: 'Test@1234' };
const CANDIDATE_NAME = 'Darshan Patel';

async function loginAndNavigateToCandidatesReport(page) {
  await page.goto(LOGIN_URL);
  await page.getByTestId('EMAIL_INPUT').fill(CREDENTIALS.email);
  await page.getByTestId('PASSWORD_INPUT').fill(CREDENTIALS.password);
  await page.getByTestId('LOGIN_BTN').click();
  await page.waitForNavigation();

  await page.getByRole('combobox').click({ force: true });
  await page.getByRole('combobox').fill(CLIENT_NAME);
  await page.locator('.ant-select-item-option', { hasText: CLIENT_NAME }).click();
  await page.waitForTimeout(3000);

  await page.locator('div').filter({ hasText: /^Candidates$/ }).click();
  await page.waitForTimeout(5000);
}

async function selectDateRangePreset(page, presetLabel) {
  await page.getByRole('textbox', { name: 'Start date' }).click();
  await page.getByText(presetLabel).click();
  await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
  await page.waitForTimeout(2000);
}

async function selectCustomDateRange(page, startDay, endDay) {
  await page.getByRole('textbox', { name: 'Start date' }).click();
  await page.waitForTimeout(500);
  await page.getByText('Custom Range').click();
  await page.waitForTimeout(300);
  const panel = page.locator('.ant-picker-panel').first();
  await panel.getByText(startDay, { exact: true }).first().click();
  await page.waitForTimeout(300);
  await panel.getByText(endDay, { exact: true }).first().click();
  await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
  await page.waitForTimeout(2000);
}

/**
 * Select a custom date range for the last N months (e.g. 6 or 12 months ending today).
 * Goes back (monthsSpan - 1) months on the left panel, picks 1st as start; right panel = current month, picks today as end.
 * @param {import('@playwright/test').Page} page
 * @param {number} monthsSpan - Number of months for the range (e.g. 6 or 12)
 */
async function selectCustomDateRangeSpanMonths(page, monthsSpan) {
  const today = new Date();
  const endDay = String(today.getDate());

  await page.getByRole('textbox', { name: 'Start date' }).click();
  await page.waitForTimeout(500);
  await page.getByText('Custom Range').click();
  await page.waitForTimeout(300);

  const leftPanel = page.locator('.ant-picker-panel').nth(0);
  const rightPanel = page.locator('.ant-picker-panel').nth(1);
  const leftPrevButton = leftPanel.locator('.ant-picker-header-prev-btn');
  const rightPrevButton = rightPanel.locator('.ant-picker-header-prev-btn');

  const monthsBack = monthsSpan - 1;
  for (let i = 0; i < monthsBack; i++) {
    await leftPrevButton.click();
    await page.waitForTimeout(200);
  }

  await leftPanel.getByText('1', { exact: true }).first().click();
  await page.waitForTimeout(300);

  await rightPrevButton.click({ force: true });
  await page.waitForTimeout(200);

  await rightPanel.getByText(endDay, { exact: true }).first().click();
  await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
  await page.waitForTimeout(2000);
}

async function selectCustomDateRangeOneYearFromToday(page) {
  const today = new Date();
  const startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const startDay = String(startDate.getDate());
  const endDay = String(today.getDate());

  await page.getByRole('textbox', { name: 'Start date' }).click();
  await page.waitForTimeout(500);
  await page.getByText('Custom Range').click();
  await page.waitForTimeout(300);

  // Ant Design RangePicker: first panel = left (start), second panel = right (end)
  const leftPanel = page.locator('.ant-picker-panel').nth(0);
  const rightPanel = page.locator('.ant-picker-panel').nth(1);
  const leftPrevButton = leftPanel.locator('.ant-picker-header-prev-btn');
  const rightPrevButton = rightPanel.locator('.ant-picker-header-prev-btn');

  // Left panel: go back 12 months so it shows start month (1 year ago)
  for (let i = 0; i < 12; i++) {
    await leftPrevButton.click();
    await page.waitForTimeout(200);
  }

  // Select start date (1 year ago) in left panel
  await leftPanel.getByText(startDay, { exact: true }).first().click();
  await page.waitForTimeout(300);

  // Right panel: when opened it often shows next month; go back once to show current month (End = today)
  await rightPrevButton.click({ force: true });
  await page.waitForTimeout(200);

  // Select end date (today) in right panel
  await rightPanel.getByText(endDay, { exact: true }).first().click();
  await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
  await page.waitForTimeout(2000);
}

/**
 * Normalize value for comparison (trim, string, collapse spaces).
 * @param {*} value
 * @returns {string}
 */
function normalizeCellValue(value) {
  if (value == null) return '';
  const s = String(value).trim().replace(/\s+/g, ' ');
  return s;
}

/**
 * Canonicalize value for comparison: treat empty string and "-" as equivalent;
 * strip trailing "%" so "82%" compares equal to "82".
 * @param {string} value - Already normalized cell value
 * @returns {string}
 */
function canonicalizeForComparison(value) {
  let v = normalizeCellValue(value);
  if (v === '-') v = '';
  if (v.endsWith('%')) v = v.slice(0, -1).trim();
  return v;
}

/**
 * Get table column headers from the Candidates page (Ant Design table).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
async function getTableHeaders(page) {
  const headerCells = page.locator('.ant-table-thead th, thead th');
  const count = await headerCells.count();
  const headers = [];
  for (let i = 0; i < count; i++) {
    const text = await headerCells.nth(i).textContent();
    const trimmed = (text || '').trim();
    if (trimmed) headers.push(trimmed);
  }
  return headers;
}

/**
 * Get row data for a candidate by name. Returns object mapping column header -> cell value.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} headers
 * @param {string} candidateName
 * @returns {Promise<Record<string, string>>}
 */
async function getCandidateRowDataFromPage(page, headers, candidateName) {
  const row = page.locator('.ant-table-tbody tr, tbody tr').filter({ hasText: candidateName }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  const cells = row.locator('td');
  const cellCount = await cells.count();
  const data = {};
  for (let i = 0; i < headers.length && i < cellCount; i++) {
    const text = await cells.nth(i).textContent();
    data[headers[i]] = normalizeCellValue(text);
  }
  return data;
}

/**
 * Excel stores dates as serial numbers (days since 1900-01-01). Convert to DD/MM/YYYY string
 * so it matches the on-page display (e.g. "26/02/2026").
 * @param {number} serial - Excel date serial (e.g. 46079.50253)
 * @returns {string} - "DD/MM/YYYY"
 */
function excelSerialToDateString(serial) {
  if (typeof serial !== 'number' || serial < 1) return String(serial ?? '');
  const dateOnly = Math.floor(serial);
  const ms = (dateOnly - 25569) * 86400 * 1000;
  const d = new Date(ms);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * When reading a cell value from XLSX, convert Excel date serials to DD/MM/YYYY so it
 * matches the page. Serial range ~1000–100000 covers 1972–2173.
 */
function rawXlsxCellToDisplayValue(value) {
  if (typeof value === 'number' && value >= 1000 && value < 100000) {
    return excelSerialToDateString(value);
  }
  return value;
}

/**
 * Parse downloaded report (XLSX or CSV) and return row data for the given candidate name.
 * Assumes first row is headers; finds first data row where any cell equals candidateName.
 * Excel date serials are converted to DD/MM/YYYY to match the page.
 * @param {string} filePath
 * @param {string} candidateName
 * @returns {Record<string, string>}
 */
function getCandidateRowDataFromFile(filePath, candidateName) {
  const ext = path.extname(filePath).toLowerCase();
  let rows;
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } else {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    rows = content.split(/\r?\n/).map((line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if ((ch === ',' && !inQuotes) || ch === '\t') {
          result.push(current.trim());
          current = '';
        } else current += ch;
      }
      result.push(current.trim());
      return result;
    });
  }
  if (!rows || rows.length < 2) return {};
  const headerRow = rows[0].map((h) => (h != null ? String(h).trim() : ''));
  const nameColIndex = headerRow.findIndex(
    (h) => h && (h.toLowerCase().includes('name') || h.toLowerCase().includes('candidate'))
  );
  const searchCol = nameColIndex >= 0 ? nameColIndex : 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const cellVal = row[searchCol] != null ? normalizeCellValue(row[searchCol]) : '';
    if (cellVal.includes(candidateName) || candidateName.includes(cellVal)) {
      const data = {};
      headerRow.forEach((h, i) => {
        if (h) {
          const raw = row[i];
          const displayVal = ext === '.xlsx' || ext === '.xls' ? rawXlsxCellToDisplayValue(raw) : raw;
          data[h] = normalizeCellValue(displayVal);
        }
      });
      return data;
    }
  }
  return {};
}

test('CR-01: Download Candidate Report for Last Week @smoke @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Last Week');

  // Assert table has loaded with at least one result (candidate names/counts may vary)
  await expect(page.getByRole('paragraph')).toContainText(/Showing \d+ to \d+ of \d+ results/);
  await expect(page.getByRole('main')).toContainText('Name'); // table header present
  // Ant Design Table adds a hidden .ant-table-measure-row; assert a real data row is visible
  await expect(page.getByRole('main').locator('table tbody tr.ant-table-row').first()).toBeVisible({ timeout: 10000 });

  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-02: Candidates report page shows Start date and Export button @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);

  await expect(page.getByRole('textbox', { name: 'Start date' })).toBeVisible();
  const exportBtn = page.getByTestId('export-candidates-button');
  await expect(exportBtn).toBeVisible();
});

test('CR-03: Export candidates triggers download and success message @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Last Week');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText('candidates exported successfully');
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-04: Download Candidate Report for Last Month @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Last Month');
  await page.waitForTimeout(2000);

  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText('candidates exported successfully');
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-05: First candidate row data on Candidates page matches downloaded report (Last Week) @report', async ({
  page,
}, testInfo) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Last Week');
  await page.waitForTimeout(2000);

  // Assert table has loaded (candidate names/counts may vary) - same as CR-01
  await expect(page.getByRole('paragraph')).toContainText(/Showing \d+ to \d+ of \d+ results/);
  await expect(page.getByRole('main')).toContainText('Name');
  await expect(page.getByRole('main').locator('table tbody tr.ant-table-row').first()).toBeVisible({ timeout: 10000 });

  const headers = await getTableHeaders(page);
  expect(headers.length).toBeGreaterThan(0);

  // Use first visible candidate name instead of a fixed name
  const nameColIndex = headers.findIndex((h) => h && h.toLowerCase().includes('name'));
  const nameCol = nameColIndex >= 0 ? nameColIndex : 0;
  const firstRow = page.locator('table tbody tr.ant-table-row').first();
  const candidateName = normalizeCellValue(await firstRow.locator('td').nth(nameCol).textContent());
  expect(candidateName).toBeTruthy();

  const pageData = await getCandidateRowDataFromPage(page, headers, candidateName);
  expect(Object.keys(pageData).length).toBeGreaterThan(0);
  console.log('Candidate data onPage:', JSON.stringify(pageData, null, 2));

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  const suggestedName = download.suggestedFilename() || 'candidates-export.xlsx';
  const downloadPath = testInfo.outputPath(suggestedName);
  await download.saveAs(downloadPath);
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);

  const fileData = getCandidateRowDataFromFile(downloadPath, candidateName);
  expect(Object.keys(fileData).length).toBeGreaterThan(0);
  console.log('Candidate data inReport:', JSON.stringify(fileData, null, 2));

  const fileKeys = Object.keys(fileData);
  const findFileValue = (pageHeader) => {
    if (fileData[pageHeader] !== undefined) return fileData[pageHeader];
    const pageNorm = pageHeader.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const fk of fileKeys) {
      const fkNorm = fk.trim().toLowerCase().replace(/\s+/g, ' ');
      if (fkNorm === pageNorm || fkNorm.includes(pageNorm) || pageNorm.includes(fkNorm)) return fileData[fk];
    }
    return undefined;
  };

  const mismatches = [];
  for (const [columnName, pageValue] of Object.entries(pageData)) {
    const fileValue = findFileValue(columnName);
    const normalizedPage = normalizeCellValue(pageValue);
    const normalizedFile = normalizeCellValue(fileValue);
    const canonicalPage = canonicalizeForComparison(normalizedPage);
    const canonicalFile = canonicalizeForComparison(normalizedFile);
    if (canonicalPage !== canonicalFile) {
      mismatches.push({
        column: columnName,
        onPage: normalizedPage,
        inReport: normalizedFile,
      });
    }
  }
  expect(
    mismatches,
    `Candidate "${candidateName}" data should match report for all columns. Mismatches: ${JSON.stringify(mismatches)}`
  ).toEqual([]);
});

// No data found for today - exit on "No data found" (same handling as CR-07); else run export
test('CR-06: Download Candidate Report for Today @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Today');
  await page.waitForTimeout(2000);

  const noDataLocator = page.getByText('No data found', { exact: true });
  const hasNoData = await noDataLocator.isVisible({ timeout: 10000 });

  if (hasNoData) {
    console.log('CR-06: No data for selected date — empty state asserted.');
    return;
  }

  const exportBtn = page.getByTestId('export-candidates-button');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await exportBtn.click({ force: true });
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

// No data found for yesterday - exit on "No data found" (same handling as CR-06); else run export
test('CR-07: Download Candidate Report for Yesterday @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'Yesterday');
  await page.waitForTimeout(2000);

  // Wait for Ant Design empty state: .ant-empty-description with "No data found"
  const noDataLocator = page.getByText('No data found', { exact: true });
  const hasNoData = await noDataLocator.isVisible({ timeout: 10000 });

  if (hasNoData) {
    console.log('CR-07: No data for selected date — empty state asserted.');
    return;
  }

  const exportBtn = page.getByTestId('export-candidates-button');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await exportBtn.click({ force: true });
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

// No data found for this week - exit on "No data found" (same handling as CR-07); else run export
test('CR-08: Download Candidate Report for This Week @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'This Week');
  await page.waitForTimeout(2000);

  const noDataLocator = page.getByText('No data found', { exact: true });
  const hasNoData = await noDataLocator.isVisible({ timeout: 10000 });

  if (hasNoData) {
    console.log('CR-08: No data for selected date — empty state asserted.');
    return;
  }

  const exportBtn = page.getByTestId('export-candidates-button');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await exportBtn.click({ force: true });
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

// No data found for this month - exit on "No data found" (same handling as CR-07); else run export
test('CR-09: Download Candidate Report for This Month @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectDateRangePreset(page, 'This Month');
  await page.waitForTimeout(2000);

  const noDataLocator = page.getByText('No data found', { exact: true });
  const hasNoData = await noDataLocator.isVisible({ timeout: 10000 });

  if (hasNoData) {
    console.log('CR-09: No data for selected date — empty state asserted.');
    return;
  }

  const exportBtn = page.getByTestId('export-candidates-button');
  await expect(exportBtn).toBeVisible({ timeout: 5000 });
  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await exportBtn.click({ force: true });
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});


test('CR-10: Download Candidate Report for Custom Range @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectCustomDateRange(page, '12', '28');
  await page.waitForTimeout(1000);

  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText('candidates exported successfully');
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-11: Download Candidate Report for 6 months @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectCustomDateRangeSpanMonths(page, 6);
  await page.waitForTimeout(2000);

  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText(/\d+ candidates exported successfully/);
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-12: Download Candidate Report for 1 year @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await selectCustomDateRangeOneYearFromToday(page);
  await page.waitForTimeout(1000);

  const downloadPromise = page.waitForEvent('download');
  const exportStartTime = Date.now();
  await page.getByTestId('export-candidates-button').click();
  const download = await downloadPromise;
  await expect(page.locator('body')).toContainText('candidates exported successfully');
  const exportTimeMs = Date.now() - exportStartTime;
  console.log(`Export and download completed in ${exportTimeMs} ms (${(exportTimeMs / 1000).toFixed(2)} s)`);
  expect(download.suggestedFilename()).toBeTruthy();
});

test('CR-13: Date range picker shows all preset options @report', async ({ page }) => {
  await loginAndNavigateToCandidatesReport(page);
  await page.getByRole('textbox', { name: 'Start date' }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('Yesterday')).toBeVisible();
  await expect(page.getByText('This Week')).toBeVisible();
  await expect(page.getByText('Last Week')).toBeVisible();
  await expect(page.getByText('This Month')).toBeVisible();
  await expect(page.getByText('Last Month')).toBeVisible();
  await expect(page.getByText('Custom Range')).toBeVisible();
  await expect(page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' })).toBeVisible();

  await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
});








