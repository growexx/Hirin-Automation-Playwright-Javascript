const { test, expect } = require('@playwright/test');

/** Must match an existing job on staging (same title used in master-workflow tests). */
const JOB_TITLE = 'Project Manager 2';
const CLIENT_NAME = 'Growexx';

async function loginAndNavigateToCreateJob(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    //await page.locator('div').filter({hasText: /^Jobs$/}).click();
    await page.getByText('Jobs', { exact: true }).click();

}

async function clickOnTheJob(page) {
    const byHeading = page.getByRole('heading', { name: JOB_TITLE }).first();
    const byCard = page.locator('.ant-card').filter({ hasText: JOB_TITLE }).first();
    const byExactText = page.getByText(JOB_TITLE, { exact: true }).first();
    await byHeading.or(byCard).or(byExactText).click({ timeout: 30000 });
    await page.waitForTimeout(2000);
}

async function closeAJob(page) {
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await page.getByText('Active', { exact: true }).click();
    await expect(page.locator(`span:has-text("Close")`).first()).toBeVisible();
    await page.locator(`span:has-text("Close")`).first().click();
}

test('For an active job invoke close the job and cancel it @regression @closeAJob', async ({ page }) => {
      await loginAndNavigateToCreateJob(page);
      await clickOnTheJob(page);
      await closeAJob(page);
      await page.waitForTimeout(3000);
      await expect(page.getByText('Close This Job Position?', { exact: true })).toBeVisible();
      await page.locator(`span:has-text("Cancel")`).click();
      await expect(page.getByText('Active', { exact: true })).toBeVisible();
      await page.waitForTimeout(3000);
});

test('Close an Active job @smoke @regression @closeAJob', async ({ page }) => {
      await loginAndNavigateToCreateJob(page);
      await clickOnTheJob(page);
      await closeAJob(page);
      await page.waitForTimeout(3000);
      await expect(page.getByText('Close This Job Position?', { exact: true })).toBeVisible();
      await page.locator(`span:has-text("Yes, Close Job")`).click();
      await expect(page.getByText('Close', { exact: true })).toBeVisible();
      await page.waitForTimeout(3000);
});
