import { test, expect } from '@playwright/test';

const JOB_TITLE = 'Mern Developer Auto';
const JOB_TITLE1 = 'Mern Developer AI';
const VALID_PDF = 'data/Job Description Mern Developer.pdf';
const INVALID_FILE = 'data/InvalidFileType.jpg';
const INVALID_SIZE = 'data/InvalidFileSize.pdf';
const FILENAME = VALID_PDF.split('/').pop();
const CLIENT_NAME = 'Growexx';
const SKILL = JOB_TITLE.split(' ')[0];

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
  await page.getByRole('button', { name: 'plus Create Job' }).click();
}

async function removeIframe(page) {
  await page.evaluate(() => {
    document.querySelector('#fc_frame')?.remove();
  });
}

test('TC-JS-01 — User gets redirected to Job Summary page when all valid mandatory inputs are provided @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();
});

test('TC-JS-02 — Next button remains disable if Job Title field is blank @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();

});

test('TC-JS-03 — Next button remains disable if Job Description field is blank @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();

});

test('TC-JS-04 — Verify error message is displayed when user Upload invalid job description file format @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(INVALID_FILE);

  await expect(page.getByText(/invalid file format/i)).toBeVisible();
  await page.waitForTimeout(3000);
});

test('TC-JS-05 — Verify error message is displayed when user Upload invalid job description file size @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(INVALID_SIZE);

  await expect(page.getByText(/File too large/i)).toBeVisible();
  await page.waitForTimeout(3000);
});

test('TC-JS-06 — Verify error message is displayed when Job Title is empty while generating job description using Zena. @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByText('Create Job Description with Zena').click();
  await page.getByRole('textbox', { name: /Write a brief/i })
    .fill('MERN developer with 2+ years experience');

  await page.getByText('Create', { exact: true }).click();

  await expect(page.getByText(/Bad Request/i)).toBeVisible();
  await page.waitForTimeout(3000);

});

test('TC-JS-07 — Verify error message is displayed when Job Title is empty while generating job description using Zena. @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Create Job Description with Zena').click();
  await page.getByRole('textbox', { name: /Write a brief/i })
    .fill('MERN developer with 2+ years experience');

  await page.getByText('Create', { exact: true }).click();

  await page.waitForTimeout(3000);
  await expect(
    page.getByPlaceholder('Generated job description will appear here...')
  ).toContainText(/Role:\s+MERN Developer/i);
});

test('TC-JS-08 — Validate client selection is mandatory @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();
});

test('TC-JS-09 — Add screening criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();

  await page.waitForTimeout(3000);
});

test('TC-JS-10 — Removed added screening criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'close', exact: true }).click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeHidden();
  await page.waitForTimeout(3000);
});

test('TC-JS-11 — Check Auto-Reject in added screening criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Auto-reject candidates who' }).check();
  await expect(page.getByRole('checkbox', { name: 'Auto-reject candidates who' })).toBeChecked()
  await page.waitForTimeout(3000);
});

test('TC-JS-12 — Uncheck Auto-Reject in added screening criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();
  const autoRejectCheckbox = page.getByRole('checkbox', {
    name: 'Auto-reject candidates who',
  });

  await autoRejectCheckbox.check();
  await expect(autoRejectCheckbox).toBeChecked();
  await page.waitForTimeout(3000);

  await autoRejectCheckbox.uncheck();
  await expect(autoRejectCheckbox).not.toBeChecked();
  await page.waitForTimeout(3000);
});

test('TC-JS-13 — Add multiple screening criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Relocation').click();
  await expect(page.locator(`span:has-text("Relocation")`)).toBeVisible();
  await page.waitForTimeout(4000);
});

test('TC-JS-14 — Remove one of the added screening criteria in case of multiple criteria @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Budget').first().click();
  await expect(page.locator(`span:has-text("Budget")`)).toBeVisible();

  await page.getByRole('button', { name: 'Add additional screening' }).click();
  await page.getByRole('combobox', { name: 'Select screening criteria to' }).click();
  await page.getByText('Relocation').click();
  await expect(page.locator(`span:has-text("Relocation")`)).toBeVisible();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'close' }).nth(2).click();
    await expect(page.locator(`span:has-text("Relocation")`)).toBeHidden();
    await page.waitForTimeout(3000);
});

test('TC-JS-15 — Validate question count minimum value @regression @createAJob @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('1');

  await page.waitForTimeout(3000);
});

test('TC-JS-16 — Validate user is able to increase question count to max 20 @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: 'Growexx' }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await spinbuttons.nth(0).fill('21');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('20');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('20');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-17 — Validate user is able to decrease question count less than 1 @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await spinbuttons.nth(0).fill('6');
  await expect(spinbuttons.nth(0)).toHaveValue('6');
  await page.mouse.click(0, 0);
  await page.waitForTimeout(3000);
  await spinbuttons.nth(0).fill('0');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('5');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-18 — Validate user is able to not able to increase interview duration more than 5 mins for 1 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('1');
  await spinbuttons.nth(1).fill('6');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('5');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-19 — Validate user is able to not able to decrease interview duration less than 1 mins for 1 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('1');
  await spinbuttons.nth(1).fill('0');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('1');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-20 — Validate user is able to not able to increase interview duration more than 10 mins for 2 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');
  await spinbuttons.nth(0).fill('2');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('2');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('2');
  await page.waitForTimeout(3000);
  await spinbuttons.nth(1).fill('11');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('10');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-21 — Validate user is able to not able to decrease interview duration more less than 2 mins for 2 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');
  await spinbuttons.nth(0).fill('2');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('2');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('2');
  await page.waitForTimeout(3000);
  await spinbuttons.nth(1).fill('0');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('2');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-22 — Validate user is able to not able to increase interview duration more than 100 mins for 20 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');
  await spinbuttons.nth(0).fill('20');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('20');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('20');
  await page.waitForTimeout(3000);
  await spinbuttons.nth(1).fill('101');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('100');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-23 — Validate user is able to not able to decrease interview duration more less than 20 mins for 20 question count @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: 'Growexx' }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');
  await spinbuttons.nth(0).fill('20');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('20');

  await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
  await expect(spinbuttons.nth(1)).toHaveValue('20');
  await page.waitForTimeout(3000);
  await spinbuttons.nth(1).fill('0');
  await page.waitForTimeout(3000);
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(1)).toHaveValue('20');

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.waitForTimeout(3000);
});

test('TC-JS-24 — User is able to remove uploaded job description @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);

  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);
  await expect(page.locator('p', { hasText: FILENAME })).toBeVisible();
  await page.getByRole('img', { name: 'delete' }).click();
  await page.waitForTimeout(3000);
  await expect(page.locator('p', { hasText: FILENAME })).toBeHidden();
});

test('TC-AC-25 : Close the Create Job drawer without adding a Job Description @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.locator(`div.ant-drawer-body > div.sc-f54b1fd4-1 > span.anticon`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, Close' }).click();
  await expect (page.getByRole('button', { name: 'plus Create Job' })).toBeVisible();
});

test('TC-AC-26 : Close the Create Job drawer Leave confirmation pop up @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.locator(`div.ant-drawer-body > div.sc-f54b1fd4-1 > span.anticon`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole('textbox', { name: /Write Job Title Here/i })).toBeVisible();
});

test('TC-IB-27 — Default key skill is displayed @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();
  await expect(page.getByPlaceholder('Enter skill')).toHaveValue(new RegExp(`^${SKILL}$`, 'i'));
});

test('TC-IB-28 — Generate interview questions (mandatory) @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await expect(page.getByTestId('question-checkbox')).toBeVisible();
});

test('TC-IB-29 — Prevent navigation without generating questions @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();
  await page.waitForTimeout(3000);
});

test('TC-IB-30 — Back functionality Interview Builder @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();
  await page.getByRole('button', { name: 'Back' }).click();

  await expect(page.locator('p', { hasText: FILENAME })).toBeVisible();
  await page.waitForTimeout(3000);
});

test('TC-IB-31 — Add custom interview question @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await expect(page.getByTestId('question-checkbox')).toBeVisible();

  await page.getByTestId('add-custom-question').click();
  await page.getByTestId('question-input').fill('Explain MERN stack');
  await page.getByTestId('save-question-button').click();

  await expect(page.getByText('Explain MERN stack')).toBeVisible();
  await page.waitForTimeout(5000);
});

test('TC-IB-32 — Validate custom question save without text @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await expect(page.getByTestId('question-checkbox')).toBeVisible();

  await page.getByTestId('add-custom-question').click();
  await expect(page.getByTestId('save-question-button')).toBeDisabled();
  await page.mouse.click(0, 0);

  await expect(page.getByText(/question text is required/i)).toBeHidden();
  await page.waitForTimeout(5000);

});

test('TC-IB-33 — User is navigated to Workflow Builder screen @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await expect(page.getByTestId('question-checkbox')).toBeVisible();

  await page.getByRole('button', { name: 'Next Arrow' }).click();

  await expect(page.getByText('Select Workflow')).toBeVisible();

});

test('TC-IB-34 — Number of question generated as @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await spinbuttons.nth(0).fill('5');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('5');

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await page.getByTestId('question-checkbox').nth(4).scrollIntoViewIfNeeded();
  await expect(page.getByTestId('question-checkbox')).toHaveCount(5,{ timeout: 8000 });
});

test('TC-IB-35 — Number of question count mismatched @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await spinbuttons.nth(0).fill('5');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('5');

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await page.getByTestId('question-checkbox').nth(4).click();
  await page.waitForTimeout(5000);
  await expect(page.getByTestId('question-checkbox')).toHaveCount(5,{ timeout: 8000 });

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();
});

test('TC-IB-36 — Interview time mismatched @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  const spinbuttons = page.locator('input[role="spinbutton"]');
  await spinbuttons.nth(0).scrollIntoViewIfNeeded();
  await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
  await expect(spinbuttons.nth(0)).toHaveValue('1');

  await spinbuttons.nth(0).fill('5');
  await page.mouse.click(0, 0);
  await expect(spinbuttons.nth(0)).toHaveValue('5');
  await expect(spinbuttons.nth(1)).toHaveValue('5');

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await page.getByTestId('question-checkbox').nth(4).scrollIntoViewIfNeeded();
  await page.locator('.ant-select-selection-item', { hasText: '1min' }).nth(4).click();
  await page.waitForTimeout(2000);
  await page.locator('.ant-select-item-option-content', { hasText: '2mins' }).click();
  await page.waitForTimeout(5000);
  await expect(page.getByTestId('question-checkbox')).toHaveCount(5,{ timeout: 8000 });

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeDisabled();
});

test('TC-WB-37 — User is navigate to Workflow Builder page @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
  await removeIframe(page);

  await page.getByText('Upload Job Description').click();
  await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

  await page.getByText('Hiring for').scrollIntoViewIfNeeded();
  await page.locator('#rc_select_3').click();
  await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

  await page.getByRole('button', { name: 'Next Arrow' }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Key Skills')).toBeVisible();

  await page.getByTestId('generate-questions-button').click();
  await expect(page.getByTestId('question-checkbox')).toHaveCount(1,{ timeout: 8000 });

  await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next Arrow' }).click();

  await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
});

test('TC-WB-38 — Recruiter Screening requires HM selection @regression @createAJob', async ({ page }) => {
  await loginAndNavigateToCreateJob(page);
    await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Upload Job Description').click();
    await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

    await page.getByRole('button', { name: 'Next Arrow' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1,{ timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Arrow' }).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
  await page.locator(`[data-testid='select-workflow']`).click();
  await page.getByText('CV Screened + Recruiter Screening + HM', { exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByText(/Please select hiring manager/i)).toBeVisible();
});

test('TC-WB-39 — Select hiring manager for HM workflow @regression @createAJob', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Upload Job Description').click();
    await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

    await page.getByRole('button', { name: 'Next Arrow' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1,{ timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Arrow' }).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
  await page.locator(`[data-testid='select-workflow']`).click();
  await page.getByText('CV Screened + Recruiter Screening + HM', { exact: true }).click();

  await page.getByText('Hiring Manager').click();
  await page.getByText('Riya.singh').click();

  await page.getByText('Select', { exact: true }).click();

  await expect(page.getByText('Riya.singh')).toBeVisible();

  await page.waitForTimeout(4000);
});

test('TC-WB-40 — Create job successfully with Job Description @smoke @regression @createAJob', async ({ page }) => {
await loginAndNavigateToCreateJob(page);
    await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Upload Job Description').click();
    await page.locator('input[type="file"]').setInputFiles(VALID_PDF);

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

    await page.getByRole('button', { name: 'Next Arrow' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1,{ timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Arrow' }).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
  await page.locator(`[data-testid='select-workflow']`).click();
  await page.getByText('CV Screened + Recruiter Screening + HM', { exact: true }).click();

  await page.getByText('Hiring Manager').click();
  await page.getByText('Riya.singh').click();

  await page.getByText('Select', { exact: true }).click();

  await expect(page.getByText('Riya.singh')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(
    page.getByText(`"${JOB_TITLE}" position has been successfully added.`)
  ).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(4000);
});

test('TC-WB-41 — Create job successfully with Job Description with Zena @smoke @regression @createAJob', async ({ page }) => {
await loginAndNavigateToCreateJob(page);
    await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_TITLE1);
    await removeIframe(page);

  await page.getByText('Create Job Description with Zena').click();
  await page.getByRole('textbox', { name: /Write a brief/i })
    .fill('MERN developer with 5+ years experience');

  await page.getByText('Create', { exact: true }).click();

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', { hasText: CLIENT_NAME }).click();

    await page.getByRole('button', { name: 'Next Arrow' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox')).toHaveCount(1,{ timeout: 8000 });

    await expect(page.getByRole('button', { name: 'Next Arrow' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Arrow' }).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
  await page.locator(`[data-testid='select-workflow']`).click();
  await page.getByText('CV Screened', { exact: true }).click();

  await page.getByRole('button', { name: 'Done' }).click();

  await expect(
    page.getByText(`"${JOB_TITLE1}" position has been successfully added.`)
  ).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(4000);
});





