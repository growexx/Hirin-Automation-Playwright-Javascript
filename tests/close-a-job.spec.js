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

async function removeIframe(page) {
    await page.evaluate(() => {
        document.querySelector('#fc_frame')?.remove();
    });
}

/**
 * Same flow as TC-WB-41 in create-jobs.spec.js (Zena description, Key Skills, workflow "CV Screened", Done).
 * Uses {@link JOB_TITLE} so the job matches {@link clickOnTheJob}.
 * @param {import('@playwright/test').Page} page
 */
async function createJobWithZena(page) {
    await removeIframe(page);
    await page.getByRole('button', { name: 'plus Create Job' }).click();
    await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Create Job Description with Zena').click();
    await page.getByRole('textbox', { name: /Write a brief/i }).fill(
        'MERN developer with 5+ years experience'
    );
    await page.getByText('Create', { exact: true }).click();

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

    await page.getByRole('button', { name: 'Next Arrow' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1, { timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Arrow' }).click();

    await expect(page.locator('[data-testid="select-workflow"]')).toBeVisible();
    await page.locator('[data-testid="select-workflow"]').click();
    await page.getByText('CV Screened', { exact: true }).click();

    await page.getByRole('button', { name: 'Done' }).click();

    await expect(
        page.getByText(`"${JOB_TITLE}" position has been successfully added.`)
    ).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(4000);
}

/**
 * Ensures {@link JOB_TITLE} exists on Jobs; creates it with Zena (TC-WB-41) if missing.
 * @param {import('@playwright/test').Page} page
 */
async function ensureJobExistsForCloseJob(page) {
    await removeIframe(page);
    await expect(page.getByRole('button', { name: 'plus Create Job' })).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1500);
    if ((await page.getByText(JOB_TITLE, { exact: true }).count()) > 0) {
        return;
    }
    await createJobWithZena(page);
    await page.getByText('Jobs', { exact: true }).click();
    await expect(page.getByText(JOB_TITLE, { exact: true }).first()).toBeVisible({ timeout: 30000 });
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
      await ensureJobExistsForCloseJob(page);
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
      await ensureJobExistsForCloseJob(page);
      await clickOnTheJob(page);
      await closeAJob(page);
      await page.waitForTimeout(3000);
      await expect(page.getByText('Close This Job Position?', { exact: true })).toBeVisible();
      await page.locator(`span:has-text("Yes, Close Job")`).click();
      await expect(page.getByText('Close', { exact: true })).toBeVisible();
      await page.waitForTimeout(3000);
});
