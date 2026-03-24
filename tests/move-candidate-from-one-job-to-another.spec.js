import { test, expect } from '@playwright/test';

/**
 * Tags: @smoke (critical path), @regression (full suite)
 * Run smoke (this file, 4 tests):  npx playwright test tests/move-candidate-from-one-job-to-another.spec.js --grep "@smoke" --project=chrome
 * Run smoke all browsers (16 = 4 tests × 4 projects):  npx playwright test tests/move-candidate-from-one-job-to-another.spec.js --grep "@smoke"
 * Run regression: npx playwright test tests/move-candidate-from-one-job-to-another.spec.js --grep "@regression" --project=chrome
 * Run this file only: npx playwright test tests/move-candidate-from-one-job-to-another.spec.js --project=chrome
 */

const JOB_TITLE = 'Mern Developer';
const JOB_TITLE1 = 'Product Owner';
const CLIENT_NAME = 'Growexx';
const SKILL = JOB_TITLE.split(' ')[0];
const RESUME = 'data/rajKashyap.pdf';
const FIRST_NAME = 'Raj'
const EMAIL = 'rajkashyap@gmail.com';
const PHONE_NUMBER = '+91 9876543210';
const EMAIL_PREFIX = EMAIL.split('@')[0];

async function loginAndNavigateToCreateJob(page) {
  await page.goto('https://stgapp.hirin.ai/login');

  await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
  await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
  await page.getByTestId('LOGIN_BTN').click();
  await page.waitForNavigation();

  await page.getByRole('combobox').click({ force: true });
  await page.getByRole('combobox').fill(CLIENT_NAME);
  await page.locator('.ant-select-item-option', { hasText: CLIENT_NAME }).click();

  //await page.locator('div').filter({ hasText: /^Jobs$/ }).click();
  await page.getByText('Jobs', { exact: true }).click();
  await page.waitForTimeout(5000);

}

async function removeIframe(page) {
  await page.evaluate(() => {
    document.querySelector('#fc_frame')?.remove();
  });
}

async function clickOnTheJob(page) {
    await page.getByRole('heading', {name: `${JOB_TITLE}`}).first().click();
    await page.waitForTimeout(2000);
}

async function uploadCandidate(page, filePath, firstName) {
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    const addCandidatesButton = page.getByRole('button', {name: 'Add candidates'});
    await addCandidatesButton.click();
    await page.waitForTimeout(3000);

    await page.getByRole('combobox').click();
    await page.getByTitle('Naukri').click();
    await removeIframe(page);

    await page.locator('#file-upload').setInputFiles(filePath);
    await page.waitForTimeout(3000);

    await expect(page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')).toBeVisible();
    await expect(page.locator('span.ant-typography', {hasText: firstName})).toBeVisible();
}

test('Create job successfully with Job Description with Zena @smoke @regression @move-candidate', async ({page}) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('button', { name: 'plus Create Job' }).click();
    await page.getByRole('textbox', {name: /Write Job Title Here/i}).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Create Job Description with Zena').click();
    await page.getByRole('textbox', {name: /Write a brief/i}).fill('MERN developer with 5+ years experience');

    await page.getByText('Create', {exact: true}).click();

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', {hasText: CLIENT_NAME}).click();

    await page.getByRole('button', {name: 'Next Arrow'}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1, {timeout: 15000});

    await expect(page.getByRole('button', {name: 'Next Arrow'})).toBeEnabled();
    await page.getByRole('button', {name: 'Next Arrow'}).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
    await page.locator(`[data-testid='select-workflow']`).click();
    await page.getByText('CV Screened', {exact: true}).click();

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(`"${JOB_TITLE}" position has been successfully added.`)).toBeVisible();

    await page.waitForTimeout(4000);
});

test('Add Candidate to the job created @smoke @regression @move-candidate', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await uploadCandidate(page, RESUME, FIRST_NAME);
    await page.getByTestId('next-button').click();
    await expect(page.getByRole('link', {name: new RegExp('raj', 'i')})).toBeVisible();

    await page.locator('[data-testid="candidate-name"]').click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Raj Kashyap');
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER);

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE}`, 'i'))).toBeVisible();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME})).toBeVisible();
});

test('Create new job successfully with Job Description with Zena @smoke @regression @move-candidate', async ({page}) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('button', { name: 'plus Create Job' }).click();
    await page.getByRole('textbox', {name: /Write Job Title Here/i}).fill(JOB_TITLE1);
    await removeIframe(page);

    await page.getByText('Create Job Description with Zena').click();
    await page.getByRole('textbox', {name: /Write a brief/i}).fill('Product Owner with 5+ years experience');

    await page.getByText('Create', {exact: true}).click();

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', {hasText: CLIENT_NAME}).click();

    await page.getByRole('button', {name: 'Next Arrow'}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1, {timeout: 8000});

    await expect(page.getByRole('button', {name: 'Next Arrow'})).toBeEnabled();
    await page.getByRole('button', {name: 'Next Arrow'}).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
    await page.locator(`[data-testid='select-workflow']`).click();
    await page.getByText('CV Screened', {exact: true}).click();

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(`"${JOB_TITLE1}" position has been successfully added.`)).toBeVisible();

    await page.waitForTimeout(4000);
});

test('Move candidate from one job to another @smoke @regression @move-candidate', async ({page}) => {
    await loginAndNavigateToCreateJob(page);
    await expect(page.getByRole('heading', { name: JOB_TITLE }).first()).toBeVisible({ timeout: 90000 });
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME})).toBeVisible();
    await page.locator('span.candidate-name', {hasText: FIRST_NAME}).click();
    await page.waitForTimeout(3000);

    await page.getByRole('button', {name: 'Move'}).click();
    await page.waitForTimeout(2000);
    await page.locator('.ant-collapse-content-active').getByText(JOB_TITLE1, { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(`Selecting for ${JOB_TITLE1}`, { exact: true })).toBeVisible();
    await page.locator(`span:has-text("Yes, Proceed")`).click();
    await expect(page.getByText(new RegExp(`candidate.*successfully assigned to.*${JOB_TITLE1}`, 'i'))).toBeVisible();
})

test('Add same Candidate to the job created @regression @move-candidate', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await uploadCandidate(page, RESUME, FIRST_NAME);
    await page.getByTestId('next-button').click();
    await expect(page.getByRole('link', {name: new RegExp('Raj', 'i')})).toBeVisible();

    await page.locator('[data-testid="candidate-name"]').click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Raj Kashyap');
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER);

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE}`, 'i'))).toBeVisible();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME})).toBeVisible();
});

test('Validate that candidate already present in the 2nd job cannot be moved from 1st job @regression @move-candidate', async ({page}) => {
    await loginAndNavigateToCreateJob(page);
    await expect(page.getByRole('heading', { name: JOB_TITLE }).first()).toBeVisible({ timeout: 90000 });
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME})).toBeVisible();
    await page.locator('span.candidate-name', {hasText: FIRST_NAME}).click();
    await page.waitForTimeout(3000);

    await page.getByRole('button', {name: 'Move'}).click();
    await page.waitForTimeout(2000);
    await page.locator('.ant-collapse-content-active').getByText(JOB_TITLE1, { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(`Selecting for ${JOB_TITLE1}`, { exact: true })).toBeVisible();
    await page.locator(`span:has-text("Yes, Proceed")`).click();
    await expect(page.getByText('Candidate already exists in job position')).toBeVisible();
})

