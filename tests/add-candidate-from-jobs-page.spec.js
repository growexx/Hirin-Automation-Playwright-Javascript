const { test, expect } = require('@playwright/test');

const BASE_URL_DEV = 'https://devapp.hirin.ai';
const BASE_URL_STAGE = 'https://stgapp.hirin.ai'
const EMAIL = 'superadmin@yopmail.com';
const PASSWORD = 'Test@1234';
const CLIENT_NAME = 'Growexx';
/** Unique per process run; starts with "Mern Developer ", max 20 characters total. */
const JOB_NAME_PREFIX = 'Mern Developer ';
const JOB_NAME = (
  JOB_NAME_PREFIX +
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20 - JOB_NAME_PREFIX.length)
).slice(0, 20);

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const FILE_PATH = 'data/Rajesh Pillai.pdf';
const FILE_PATH1 = 'data/Shailendra Rathore.pdf';
const INVALID_FILE_TYPE = 'data/InvalidFileType.jpg';
const INVALID_FILE_SIZE ='data/InvalidFileSize.pdf';
const FIRST_NAME = FILE_PATH.split('/').pop().split(' ')[0];
const FIRST_NAME1 = FILE_PATH1.split('/').pop().split(' ')[0];
//29//

// ------------------ Helper functions ------------------ //

async function login(page) {
  await page.goto(`${BASE_URL_STAGE}/login`);
  await page.getByTestId('EMAIL_INPUT').fill(EMAIL);
  await page.getByTestId('PASSWORD_INPUT').fill(PASSWORD);
  await page.getByTestId('LOGIN_BTN').click();
  await page.waitForNavigation();
}

async function closeOnboardingModalIfPresent(page) {
  const welcomeIframeCloseButton = page.locator('iframe[title="Modal"]').contentFrame().getByRole('button', { name: 'Close Step' });
  await welcomeIframeCloseButton.waitFor({ state: 'visible' });
  await welcomeIframeCloseButton.click();
}

async function removeChatIframe(page) {
  await page.evaluate(() => {
     const fcFrame = document.querySelector('#fc_frame');
       if (fcFrame) {
         fcFrame.remove();
       }
     });
}

async function goToJob(page) {
  await page.waitForTimeout(5000);
 // await expect(page.locator('div').filter({ hasText: /^Jobs$/ })).toBeVisible();
  await expect(page.getByText('Jobs', { exact: true })).toBeVisible();
  await page.getByText('Jobs', { exact: true }).click();
 // await page.locator('div').filter({ hasText: /^ $/ }).click();
}

/**
 * Creates the target job using the same flow as TC-WB-41 in create-jobs.spec.js
 * (Zena job description, Key Skills, workflow "CV Screened", Done).
 * @param {import('@playwright/test').Page} page
 */
async function createJobWithZenaLikeWB41(page) {
  await removeChatIframe(page);
  await page.getByRole('button', { name: 'plus Create Job' }).click();
  await page.getByRole('textbox', { name: /Write Job Title Here/i }).fill(JOB_NAME);
  await removeChatIframe(page);

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
    page.getByText(`"${JOB_NAME}" position has been successfully added.`)
  ).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(4000);
}

/**
 * Ensures {@link JOB_NAME} exists on the Jobs list; creates it via Zena (TC-WB-41) if missing.
 * @param {import('@playwright/test').Page} page
 */
async function ensureJobExists(page) {
  await removeChatIframe(page);
  await expect(page.getByRole('button', { name: 'plus Create Job' })).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  if ((await page.getByText(JOB_NAME, { exact: true }).count()) > 0) {
    return;
  }
  await createJobWithZenaLikeWB41(page);
  await goToJob(page);
  await expect(page.getByText(JOB_NAME, { exact: true }).first()).toBeVisible({ timeout: 30000 });
}

async function clickOnTheJob(page) {
  const byHeading = page.getByRole('heading', { name: JOB_NAME }).first();
  const byCard = page.locator('.ant-card').filter({ hasText: JOB_NAME }).first();
  const byExactText = page.getByText(JOB_NAME, { exact: true }).first();
  await byHeading.or(byCard).or(byExactText).click({ timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function uploadCandidate(page, filePath, firstName) {
  await goToJob(page);
 // await closeOnboardingModalIfPresent(page);
  await clickOnTheJob(page);

  await page.locator('#rc-tabs-0-tab-2').click();
  const addCandidatesButton = page.getByRole('button', { name: 'Add candidates' });
  //await expect(addCandidatesButton).toBeEnabled({ timeout: 25000 });
  await addCandidatesButton.click();
  await removeChatIframe(page);
  await page.getByRole('combobox').click();
  await page.getByTitle('Naukri').click();

  await page.locator('#file-upload').setInputFiles(filePath);

  await page.waitForTimeout(3000);

  await expect(
    page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')
  ).toBeVisible();

  await expect(
    page.locator('span.ant-typography', { hasText: firstName })
  ).toBeVisible();
}


// ------------------ Tests ------------------ //
test.beforeEach(async ({ page }) => {
  await login(page);
 // await closeOnboardingModalIfPresent(page);
  await removeChatIframe(page);
  await expect(page.getByRole('combobox')).toBeVisible();
  await page.getByRole('combobox').click({ force: true });
  await page.getByRole('combobox').fill(CLIENT_NAME);
  await page.locator('.ant-select-item-option', { hasText: CLIENT_NAME }).click();
  await goToJob(page);
  await ensureJobExists(page);
  await page.reload();
});

test.only('TC-AC-01 : Add Candidate @smoke @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH1, FIRST_NAME1);

  await page.getByTestId('next-button').click();
  await expect(page.getByRole('link', { name: new RegExp('Shailendr', 'i') })).toBeVisible();

  await page.getByRole('button', { name: 'Done' }).click();

  await expect(
    page.getByText(new RegExp(`candidate.*successfully added.*${escapeRegExp(JOB_NAME)}`, 'i'))
  ).toBeVisible();

  await expect(page.locator('span.candidate-name', { hasText: FIRST_NAME1 })).toBeVisible();
});

test.only('TC-AC-02 : Duplicate Candidate @smoke @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH1, FIRST_NAME1);
  await page.getByTestId('next-button').click();

  await expect(
    page.locator('article', { hasText: /Candidate Already Applied$/ })
  ).toBeVisible();
});

test('TC-AC-03 : Remove Uploaded Resume @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);

  await page.locator('img[alt="delete"]').first().click();

  await page.waitForTimeout(3000);
  await expect(page.getByText('File deleted successfully', { exact: true })).toBeVisible();
  await expect(page.locator(`img[src="/Success-upload.svg"][alt="upload_file"]`)).not.toBeVisible();
  await expect(page.locator('span.ant-typography', { hasText: FIRST_NAME })).not.toBeVisible();
});

test('TC-AC-04 : Check back functionality @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);

  await page.getByTestId('next-button').click();

  await page.getByRole('button', { name: 'Back' }).click();

  await expect(page.locator(`img[src="/Success-upload.svg"][alt="upload_file"]`)).toBeVisible();
  await expect(page.locator('span.ant-typography', { hasText: FIRST_NAME })).toBeVisible();
});

test('TC-AC-05 : Close the Add Candidate drawer without adding a resume @regression @addCandidateFromJobsPage', async ({ page }) => {
 // await closeOnboardingModalIfPresent(page);
  await clickOnTheJob(page);
  await page.locator('#rc-tabs-0-tab-2').click();
  await page.getByRole('button', { name: 'Add candidates' }).click();
  await page.locator(`div.sc-2653d72d-1 > span.anticon > svg`).click();
  await expect(page.getByRole('combobox')).not.toBeVisible();
});

test('TC-AC-06 : Close the Add Candidate drawer after adding a resume @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator(`div.sc-2653d72d-1 > span.anticon > svg`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, Close' }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole('combobox')).not.toBeVisible();
});

test('TC-AC-07 : Close the Add Candidate Leave confirmation pop up to resume Adding Candidate flow @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator(`div.sc-2653d72d-1 > span.anticon > svg`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(3000);
    await expect(
      page.locator('span.ant-typography', { hasText: FIRST_NAME })
    ).toBeVisible();
});

test('TC-AC-08 : Close the Verify Details drawer after adding a resume @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.locator(`div.sc-2653d72d-1 > span.anticon > svg`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, Close' }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole('combobox')).not.toBeVisible();
});

test('TC-AC-09 : Close the Add Candidate Leave confirmation pop up to resume Adding Candidate flow on Verify Details screen @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.locator(`div.sc-2653d72d-1 > span.anticon > svg`).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Are you sure you want to leave?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(3000);
  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).toBeVisible();
});

test('TC-AC-10 : Add multiple resume @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator('#file-upload').setInputFiles(FILE_PATH1);
  await page.waitForTimeout(3000);
  await expect(
    page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')
  ).toHaveCount(2);
});

test('TC-AC-11 : Remove all uploaded resume @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator('#file-upload').setInputFiles(FILE_PATH1);
  await page.waitForTimeout(3000);
  await expect(
    page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')
  ).toHaveCount(2);
  await expect(page.getByText('Remove All', { exact: true })).toBeVisible();
  await page.getByText('Remove All', { exact: true }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('All files deleted successfully', { exact: true })).toBeVisible();
  await expect(page.locator(`img[src="/Success-upload.svg"][alt="upload_file"]`)).not.toBeVisible();
});

test('TC-AC-12 : Invalid File Type Upload @regression @addCandidateFromJobsPage', async ({ page }) => {
 // await closeOnboardingModalIfPresent(page);
  await clickOnTheJob(page);
  await page.locator('#rc-tabs-0-tab-2').click();
  await page.getByRole('button', { name: 'Add candidates' }).click();
  await page.getByRole('combobox').click();
  await page.getByTitle('Naukri').click();
  await page.locator('#file-upload').setInputFiles(INVALID_FILE_TYPE);
  await page.waitForTimeout(3000);
  await expect(page.locator(`img[src="/Failure-upload.svg"][alt="upload_file"]`)).toBeVisible();
  await page.locator('img[src="/Failure-upload.svg"][alt="upload_file"]').hover();
  await page.waitForTimeout(3000);
  const tooltip = page.locator('div.ant-tooltip-inner',{ hasText: /Invalid file type/i });
  await tooltip.waitFor({ state: 'visible' });
  await expect(tooltip).toHaveText(
    'Invalid file type. Only .pdf, .doc and .docx allowed'
  );
  await expect(page.getByTestId('next-button')).toBeDisabled();
});

test('TC-AC-13 : Invalid File Size Upload @regression @addCandidateFromJobsPage', async ({ page }) => {
 // await closeOnboardingModalIfPresent(page);
  await clickOnTheJob(page);
  await page.locator('#rc-tabs-0-tab-2').click();
  await page.getByRole('button', { name: 'Add candidates' }).click();
  await page.getByRole('combobox').click();
  await page.getByTitle('Naukri').click();
  await page.locator('#file-upload').setInputFiles(INVALID_FILE_SIZE);
  await page.waitForTimeout(3000);
  await expect(page.locator(`img[src="/Failure-upload.svg"][alt="upload_file"]`)).toBeVisible();
  await page.locator('img[src="/Failure-upload.svg"][alt="upload_file"]').hover();
  await page.waitForTimeout(3000);
  const tooltip = page.locator('div.ant-tooltip-inner',{ hasText: /File size exceeds/i });
  await tooltip.waitFor({ state: 'visible' });
  await expect(tooltip).toHaveText(
    'File size exceeds 5MB limit'
  );
  await expect(page.getByTestId('next-button')).toBeDisabled();
});

test('TC-AC-14 : Next button should not get enable if any one of the multiple upload resume is invalid type @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator('#file-upload').setInputFiles(INVALID_FILE_TYPE);
  await page.waitForTimeout(3000);
  await expect(page.locator(`img[src="/Failure-upload.svg"][alt="upload_file"]`)).toBeVisible();
  await page.locator('img[src="/Failure-upload.svg"][alt="upload_file"]').hover();
  await page.waitForTimeout(3000);
  const tooltip = page.locator('div.ant-tooltip-inner',{ hasText: /Invalid file type/i });
  await tooltip.waitFor({ state: 'visible' });
  await expect(tooltip).toHaveText('Invalid file type. Only .pdf, .doc and .docx allowed');
  await expect(page.getByTestId('next-button')).toBeDisabled();
});

test('TC-AC-15 : Next button should not get enable if any one of the multiple upload resume is invalid size @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.locator('#file-upload').setInputFiles(INVALID_FILE_SIZE);
  await page.waitForTimeout(3000);
  await expect(page.locator(`img[src="/Failure-upload.svg"][alt="upload_file"]`)).toBeVisible();
  await page.locator('img[src="/Failure-upload.svg"][alt="upload_file"]').hover();
  await page.waitForTimeout(3000);
  const tooltip = page.locator('div.ant-tooltip-inner',{ hasText: /File size exceeds/i });
  await tooltip.waitFor({ state: 'visible' });
  await expect(tooltip).toHaveText('File size exceeds 5MB limit');
  await expect(page.getByTestId('next-button')).toBeDisabled();
});

test('TC-AC-16 : Uncheck checkbox in case of Duplicate Candidate @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH1, FIRST_NAME1);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-17 : Checked checkbox in case of Valid Candidate @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).toBeChecked();
});

test('TC-AC-18 : Validate error message in case of empty name @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-name"]').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('');
  await page.locator('body').click();

  await page.locator('[data-testid="candidate-name"]').hover();

  const nameTooltip = page.locator('div[role="tooltip"]', {hasText: 'Candidate Name Missing',});
  await nameTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(nameTooltip).toContainText('Candidate Name Missing');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.hover();

  const mandatoryFieldsTooltip = await page.locator('div[role="tooltip"]', { hasText: 'Missing Mandatory Fields' });
  await mandatoryFieldsTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(mandatoryFieldsTooltip).toHaveText('Missing Mandatory Fields');


  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-19 : Validate error message in case of empty email @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-email"]').click();
  await page.getByRole('textbox', { name: 'email' }).fill('');
  await page.locator('body').click();

  const emailTooltip = page.locator('div[role="tooltip"]', {hasText: 'Email Address Missing',});
  await emailTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(emailTooltip).toContainText('Email Address Missing');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.hover();

  const mandatoryFieldsTooltip = await page.locator('div[role="tooltip"]', { hasText: 'Missing Mandatory Fields' });
  await mandatoryFieldsTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(mandatoryFieldsTooltip).toHaveText('Missing Mandatory Fields');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-20 : Validate error message in case of empty phone @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-phone"]').click();
  await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill('');
  await page.locator('body').click();

  const phoneTooltip = page.locator('div[role="tooltip"]', {hasText: 'Phone Number Missing',});
  await phoneTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(phoneTooltip).toContainText('Phone Number Missing');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.hover();

  const mandatoryFieldsTooltip  = await page.locator('div[role="tooltip"]', { hasText: 'Invalid Phone Number' });
  await mandatoryFieldsTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(mandatoryFieldsTooltip ).toHaveText('Invalid Phone Number');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-21 : Validate error message in case of multiple empty fields @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);

  await page.locator('[data-testid="candidate-name"]').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('');

  await page.locator('[data-testid="candidate-email"]').click();
  await page.getByRole('textbox', { name: 'email' }).fill('');

  await page.locator('[data-testid="candidate-phone"]').click();
  await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill('');

  await page.locator('body').click();

  await page.locator('[data-testid="candidate-name"]').hover();
  const nameTooltip = page.locator('div[role="tooltip"]', {hasText: 'Candidate Name Missing',});
  await nameTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(nameTooltip).toContainText('Candidate Name Missing');

  await page.locator('[data-testid="candidate-email"]').hover();
  const emailTooltip = page.locator('div[role="tooltip"]', {hasText: 'Email Address Missing',});
  await emailTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(emailTooltip).toContainText('Email Address Missing');

  await page.locator('[data-testid="candidate-phone"]').hover();
  const phoneTooltip = page.locator('div[role="tooltip"]', {hasText: 'Phone Number Missing',});
  await phoneTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(phoneTooltip).toContainText('Phone Number Missing');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.hover();

  const tooltip = await page.locator('div[role="tooltip"]', { hasText: 'Missing Mandatory Fields' });
  await tooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(tooltip).toHaveText('Missing Mandatory Fields');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-22 : Validate error message in case of invalid name @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);

  await page.locator('[data-testid="candidate-name"]').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('3123131');
  await page.locator('body').click();

  await page.locator('[data-testid="candidate-name"]').hover();
  const nameTooltip = page.locator('div[role="tooltip"]', {hasText: 'Invalid Candidate Name Format',});
  await nameTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(nameTooltip).toContainText('Invalid Candidate Name Format');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.hover();

  const invalidNameTooltip  = await page.locator('div[role="tooltip"][id*="r"]',{ hasText: 'Invalid Candidate Name Format' }).last();
  await invalidNameTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(invalidNameTooltip ).toHaveText('Invalid Candidate Name Format');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-23 : Validate error message in case of invalid email @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);

  await page.locator('[data-testid="candidate-email"]').click();
  await page.getByRole('textbox', { name: 'email' }).fill('rajeshpillai23');
  await page.locator('body').click();

  await page.locator('[data-testid="candidate-email"]').hover();

 // await expect(page.getByRole('tooltip')).toContainText('Invalid Email Address');

  const emailTooltip = await page.locator('[role="tooltip"]');
  await emailTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(emailTooltip).toContainText('Invalid Email Address');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.hover();

  const checkboxTooltip = await page.locator('div[role="tooltip"][id*="r"]',{ hasText: 'Invalid Email Address' }).last();
  await checkboxTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(checkboxTooltip).toHaveText('Invalid Email Address');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-24 : Validate error message in case of invalid phone @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);

  await page.locator('[data-testid="candidate-phone"]').click();
  await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill('2324');
  await page.locator('body').click();

  await page.locator('[data-testid="candidate-phone"]').hover();
  const phoneTooltip = page.locator('div[role="tooltip"]', {hasText: 'Invalid Phone Number Format',});
  await phoneTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(phoneTooltip).toContainText('Invalid Phone Number Format');

  const checkbox = page.locator('td[data-testid="candidate-select"]');
  await checkbox.scrollIntoViewIfNeeded();
  await checkbox.hover();

  const checkboxTooltip = await page.locator('div[role="tooltip"][id*="r"]', { hasText: 'Invalid Phone Number' }).last();
  await checkboxTooltip.waitFor({ state: 'visible', timeout: 5000 });
  await expect(checkboxTooltip).toHaveText('Invalid Phone Number');

  await expect(page.locator('td[data-testid="candidate-select"] input[type="checkbox"]')).not.toBeChecked();
});

test('TC-AC-25 : Validate no error message in case user edit name of the Candidate with valid data @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-name"]').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Saurabh');
  await page.locator('body').click();
  await page.waitForTimeout(3000);

  const checkbox = page.locator('td[data-testid="candidate-select"] input[type="checkbox"]');
  await expect(checkbox).toBeChecked();

  await expect(page.getByRole('button', { name: 'Done' })).toBeEnabled();
});

test('TC-AC-26 : Validate no error message in case user edit email of the Candidate with valid data @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-email"]').click();
  await page.getByRole('textbox', { name: 'email' }).fill('saurabh@yopmail.com');
  await page.locator('body').click();

  const checkbox = await page.locator('td[data-testid="candidate-select"] input[type="checkbox"]');
  await expect(checkbox).toBeChecked();

  await expect(page.getByRole('button', { name: 'Done' })).toBeEnabled();
});

test('TC-AC-27 : Validate no error message is displayed if user edit phone number of the Candidate with valid data @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(6000);
  await page.locator('[data-testid="candidate-phone"]').click();
  await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill('+91 463277372');
  await page.locator('body').click();

  const checkbox = await page.locator('td[data-testid="candidate-select"] input[type="checkbox"]');
  await checkbox.scrollIntoViewIfNeeded();
  await expect(checkbox).toBeChecked();

  await expect(page.getByRole('button', { name: 'Done' })).toBeEnabled();
});

test('TC-AC-28 : Validate error message in case of Add Candidate for Closed Job @regression @addCandidateFromJobsPage', async ({ page }) => {
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(3000);
  await goToJob(page);
 // await closeOnboardingModalIfPresent(page);
  await clickOnTheJob(page);
  await page.locator('#rc-tabs-0-tab-2').click();
  await page.getByRole('button', { name: 'Add candidates' }).hover();
  await expect(await page.getByRole('tooltip')).toContainText('Candidate cannot be added as the job position is not in active status.');
});

test('TC-AC-29 : Clickable resume link and open on new tab @regression @addCandidateFromJobsPage', async ({ page }) => {
  await uploadCandidate(page, FILE_PATH, FIRST_NAME);
  await page.getByTestId('next-button').click();
  await expect(page.locator('td[data-testid="candidate-resume"] a')).toBeVisible();
  await page.locator('td[data-testid="candidate-resume"] a').click();
  const page1Promise = page.waitForEvent('popup');
  const page1 = await page1Promise;
  await expect(page1.getByText('RAJESH M.P.')).toBeVisible();
});




