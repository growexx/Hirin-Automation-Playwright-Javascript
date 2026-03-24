import {test,expect} from '@playwright/test';

const CLIENT_NAME = 'Growexx';

async function loginAndNavigateToReports(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    await page.getByText('Reports', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Recruitment Report' })).toBeVisible({ timeout: 5000 });
}

async function dateSelection(page) {
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.getByText('12').nth(1).click();
    await page.getByRole('textbox', { name: 'End date' }).click();
    await page.getByText('12').nth(1).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('textbox', { name: 'Start date' })).toHaveValue('25 Feb 2026');
    await expect(page.getByRole('textbox', { name: 'End date' })).toHaveValue('25 Feb 2026');
}

async function dateSelectionTwoMonths(page) {
    await page.getByRole('textbox', { name: 'End date' }).click();
    await page.getByText('25').nth(1).click();
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.getByRole('button', { name: 'Previous month (PageUp)' }).click();
    await page.getByText('26').first().click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('textbox', { name: 'Start date' })).toHaveValue('26 Dec 2025');
    await expect(page.getByRole('textbox', { name: 'End date' })).toHaveValue('25 Feb 2026');
}

test('Generate report for 1 day @smoke @regression @downloadReport', async ({page}) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await page.getByTestId('report-generate-btn').click();
    await expect(page.getByRole('paragraph')).toContainText('Your report has been generated successfully.');
    await page.waitForTimeout(3000);
});

test('Generate report for 2 months @regression @downloadReport', async ({page}) => {
    await loginAndNavigateToReports(page);
    await dateSelectionTwoMonths(page);
    await page.getByTestId('report-generate-btn').click();
    await expect(page.getByRole('paragraph')).toContainText('Your report has been generated successfully.');
    await page.waitForTimeout(3000);
});

test('Download report without generating @regression @downloadReport', async ({page}) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await expect(page.getByTestId('report-download-btn')).toBeDisabled();
    await page.waitForTimeout(3000);
})

test('Download report @smoke @regression @downloadReport', async ({page}) => {
    await loginAndNavigateToReports(page);
    await dateSelection(page);
    await page.getByTestId('report-generate-btn').click();
    await expect(page.getByRole('paragraph')).toContainText('Your report has been generated successfully.');
    await page.waitForTimeout(3000);
    const page1Promise = page.waitForEvent('popup');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('report-download-btn').click();
    const page1 = await page1Promise;
    const download = await downloadPromise;
    await page.waitForTimeout(3000);
});

