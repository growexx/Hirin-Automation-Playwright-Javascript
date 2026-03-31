import { test, expect } from '@playwright/test';

const CLIENT_NAME = 'Growexx';

async function loginAndNavigateToReports(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({ force: true });
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', { hasText: CLIENT_NAME }).click();

    await page.getByText('Reports', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Recruitment Report' })).toBeVisible({ timeout: 5000 });
}

/**
 * Same pattern as {@link selectDateRangePreset} in candidates-report.spec.js
 * @param {import('@playwright/test').Page} page
 * @param {string} presetLabel
 */
async function selectDateRangePreset(page, presetLabel) {
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.getByText(presetLabel).click();
    await page.locator('.ant-picker-footer').getByRole('button', { name: 'Done' }).click({ force: true });
    await page.waitForTimeout(2000);
}

/**
 * Same pattern as {@link selectCustomDateRangeSpanMonths} in candidates-report.spec.js
 * @param {import('@playwright/test').Page} page
 * @param {number} monthsSpan
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

/** Ant Design inputs often use zero-padded day ("01 Jan 2026"); avoid strict string compare to `toLocaleDateString`. */
const REPORT_DATE_MONTHS = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Sept: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
};

/**
 * @param {string} s e.g. "01 Jan 2026" or "1 Feb 2026"
 * @returns {Date} local date at midnight
 */
function parseReportDateInput(s) {
    const parts = String(s).trim().split(/\s+/);
    if (parts.length !== 3) throw new Error(`Unparseable report date: "${s}"`);
    const day = parseInt(parts[0], 10);
    const month = REPORT_DATE_MONTHS[parts[1]];
    if (month == null) throw new Error(`Unknown month in report date: "${s}"`);
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

/**
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
function sameLocalCalendarDate(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/** Recruitment report — single day: preset Today (candidates-report pattern). */
async function dateSelection(page) {
    await selectDateRangePreset(page, 'Today');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startVal = await page.getByRole('textbox', { name: 'Start date' }).inputValue();
    const endVal = await page.getByRole('textbox', { name: 'End date' }).inputValue();
    expect(sameLocalCalendarDate(parseReportDateInput(startVal), today)).toBe(true);
    expect(sameLocalCalendarDate(parseReportDateInput(endVal), today)).toBe(true);
}

/** Recruitment report — ~2-month window: Custom Range + span logic from candidates-report. */
async function dateSelectionTwoMonths(page) {
    await selectCustomDateRangeSpanMonths(page, 2);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startVal = await page.getByRole('textbox', { name: 'Start date' }).inputValue();
    const endVal = await page.getByRole('textbox', { name: 'End date' }).inputValue();
    const startD = parseReportDateInput(startVal);
    const endD = parseReportDateInput(endVal);
    expect(sameLocalCalendarDate(endD, today)).toBe(true);
    expect(startD.getDate()).toBe(1);
    expect(startD.getTime()).toBeLessThanOrEqual(endD.getTime());
    const days = (endD.getTime() - startD.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(27);
    expect(days).toBeLessThanOrEqual(95);
}

test('Generate report for 1 day @smoke @regression @downloadReport', async ({ page }) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await page.getByTestId('report-generate-btn').click();
    await expect(page.getByRole('paragraph')).toContainText('Your report has been generated successfully.');
    await page.waitForTimeout(3000);
});


test('Download report without generating @regression @downloadReport', async ({ page }) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await expect(page.getByTestId('report-download-btn')).toBeDisabled();
    await page.waitForTimeout(3000);
});

test('Download report @smoke @regression @downloadReport', async ({ page }) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await page.getByTestId('report-generate-btn').click();
    await expect(page.getByRole('paragraph')).toContainText('Your report has been generated successfully.');
    await page.getByAltText('Close').click();
    const page1Promise = page.waitForEvent('popup');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('report-download-btn').click();
    const page1 = await page1Promise;
    const download = await downloadPromise;
    await page.waitForTimeout(3000);
});
