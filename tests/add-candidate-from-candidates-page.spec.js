const { test, expect } = require('@playwright/test');

const BASE_URL_DEV = 'https://devapp.hirin.ai';
const BASE_URL_STAGE = 'https://stgapp.hirin.ai'
const EMAIL = 'superadmin@yopmail.com';
const PASSWORD = 'Test@1234';
const JOB_NAME = 'Mern Developer Auto';
const FILE_PATH = 'data/Rajesh Pillai.pdf';
const FILE_PATH1 = 'data/Shailendra Rathore.pdf';
const INVALID_FILE_TYPE = 'data/InvalidFileType.jpg';
const INVALID_FILE_SIZE ='data/InvalidFileSize.pdf';
const FIRST_NAME = FILE_PATH.split('/').pop().split(' ')[0];
const FIRST_NAME1 = FILE_PATH1.split('/').pop().split(' ')[0];
//1//

// ------------------ Helper functions ------------------ //

async function login(page) {
  await page.goto(`${BASE_URL_STAGE}/login`);
  await page.getByTestId('EMAIL_INPUT').fill(EMAIL);
  await page.getByTestId('PASSWORD_INPUT').fill(PASSWORD);
  await page.getByTestId('LOGIN_BTN').click();
  await page.waitForNavigation();
}

async function removeChatIframe(page) {
  await page.evaluate(() => {
     const fcFrame = document.querySelector('#fc_frame');
       if (fcFrame) {
         fcFrame.remove();
       }
     });
}

async function goToCandidates(page) {
  // Single row in the left nav (avoids matching both div.menu-item + inner span).
  const candidatesNav = page.locator('div.menu-item').filter({ hasText: /^Candidates$/ }).first();
  await expect(candidatesNav).toBeVisible({ timeout: 15000 });
  await candidatesNav.click();
}

test.beforeEach(async ({ page }) => {
  await login(page);
 // await closeOnboardingModalIfPresent(page);
  await removeChatIframe(page);
  await expect(page.getByRole('combobox')).toBeVisible();
  await page.getByRole('combobox').click({ force: true });
  await page.getByRole('combobox').fill('Growexx');
  await page.locator('.ant-select-item-option', { hasText: 'Growexx' }).click();
  await goToCandidates(page);
  await page.waitForTimeout(6000);
});

test('TC-AC-CP-01 : Verify user is able to Add Candidate from the Candidates Page @smoke @regression @addCandidateFromCandidatePage', async ({ page }) => {
    const addCandidatesButton = page.getByRole('button', { name: 'Add candidates' });
    await addCandidatesButton.click();
    await removeChatIframe(page);
    await page.waitForTimeout(4000);
    const jobPosition = await page.locator(`span:has-text("Select Job Position")`);
    await jobPosition.waitFor({ state: 'visible', timeout: 5000 });
    await jobPosition.click();
    await page.getByRole('tooltip').getByText(JOB_NAME).first().click();

    const source = await page.locator('.ant-select').filter({ hasText: 'Source' }).getByRole('combobox');
    await source.waitFor({ state: 'visible', timeout: 5000 });
    await source.click();
    await page.getByTitle('Naukri').click();

    await page.locator('#file-upload').setInputFiles(FILE_PATH);

    await page.waitForTimeout(3000);
    await expect(page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')).toBeVisible();
    await expect(page.locator('span.ant-typography', { hasText: FIRST_NAME })).toBeVisible();

    await page.getByTestId('next-button').click();
    await page.waitForTimeout(4000);

    await expect(page.getByRole('link', { name: new RegExp('Rajesh', 'i') })).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_NAME}`, 'i'))).toBeVisible();

    const candidate = await page.locator('span', { hasText: new RegExp(`\\b${FIRST_NAME}\\b`, 'i')}).first();
   // page.locator('span.ant-radio-label >> span', { hasText: new RegExp(`\\b${FIRST_NAME}\\b`, 'i')}).first();

    await expect(candidate).toBeVisible();
    await candidate.click();
    await page.waitForTimeout(5000);

    console.log("Test passed successfully")
});


