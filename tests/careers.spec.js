import {test,expect} from '@playwright/test';

const CLIENT_NAME = 'Growexx';
const LOGO = 'data/logo.png';
const NEW_LOGO = 'data/newLogo.png';
const JOB_SEARCH = 'Software Tester';
const RESUME = 'data/Rajesh Pillai.pdf';
const FULL_NAME = 'Rajesh Kumar'
const EMAIL = 'rajeshkumar@gmail.com';
const PHONE_NUMBER = '9876543210';
const JOB_SEARCH1 = 'Project Manager 2';
const RESUME1 = 'data/Shailendra Rathore.pdf';
const FULL_NAME1 = 'Shailendra';
const EMAIL1 = 'shailendra.cliqe@gmail.com';
const PHONE_NUMBER1 = '9876543210';
const JOB_SEARCH2 = 'Product Owner';
const RESUME2 = 'data/Avinash_Singh.pdf';
const FULL_NAME2 = 'Avinash Singh';
const EMAIL2 = 'avinashsingh221@gmail.com';
/** `98765432347` → fixed prefix `98765` + 6-digit suffix (suffix from {@link uniquePhoneNumber2}). */
const PHONE_NUMBER2_PREFIX = '98765';

/**
 * Same base as legacy `98765432347`, but last 6 digits change every test (avoids duplicate-phone rejection on apply).
 * @param {import('@playwright/test').TestInfo} testInfo
 * @returns {string}
 */
function uniquePhoneNumber2(testInfo) {
    const suffix = String((Date.now() + testInfo.workerIndex * 1_000_007) % 1_000_000).padStart(6, '0');
    return `${PHONE_NUMBER2_PREFIX}${suffix}`;
}

const LOGIN_URL = 'https://stgapp.hirin.ai/login';
const CREDENTIALS = { email: 'superadmin@yopmail.com', password: 'Test@1234' };

const SETTINGS_CLICK_MAX_RETRIES = 3;
const SETTINGS_NAV_WAIT_MS = 5000;

/**
 * Clicks the Settings menu item with retry. Sometimes a single click does not navigate;
 * this waits for the Careers Page link to become visible and retries the click if needed.
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function clickSettingsWithRetry(page) {
    const settingsBtn = page.getByText('Settings', { exact: true });
    const careersPageLink = page.locator('div').filter({ hasText: /^Careers Page$/ }).first();

    for (let attempt = 1; attempt <= SETTINGS_CLICK_MAX_RETRIES; attempt++) {
        await settingsBtn.click();
        try {
            await careersPageLink.waitFor({ state: 'visible', timeout: SETTINGS_NAV_WAIT_MS });
            return;
        } catch {
            if (attempt === SETTINGS_CLICK_MAX_RETRIES) {
                throw new Error(`Settings click did not open menu after ${SETTINGS_CLICK_MAX_RETRIES} attempts`);
            }
            await page.waitForTimeout(500);
        }
    }
}

async function loginAndNavigateToCareers(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    await clickSettingsWithRetry(page);
    await page.locator('div').filter({ hasText: /^Careers Page$/ }).first().click();
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByLabel('Careers Page').first()).toContainText('Careers Page');
}

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

test('TC-CP-01 : Verify user is able to navigate to Careers Page @smoke @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
});

test('TC-CP-02 : Verify that when the Enable Careers Page toggle button is on, Careers Page Link and Career Page Preview is visible @smoke @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Careers Page Link', { exact: true })).toBeVisible();
    await expect(page.locator('.url-display input')).toHaveValue('https://growexx-stg.hirin.ai/careers');
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
});

test('TC-CP-03 : Verify that when the Enable Careers Page toggle button is off, Careers Page Link and Career Page Preview is not visible @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
    await page.getByRole('switch').first().click();
    await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Careers Page Link', { exact: true })).not.toBeVisible();
    await expect(page.locator('.url-display input')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview' })).not.toBeVisible();
});

test('TC-CP-04 : Verify that if user makes any change in the Careers Page Primary Color, it is reflected in the Career Page Preview @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Primary Color', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Careers Page')).toContainText('#DC2626');
    await page.getByText('#DC2626').click();
    await page.locator('div:nth-child(7) > .ant-color-picker-color-block-inner').click();
    await expect(page.getByLabel('Careers Page')).toContainText('#059669');
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');
    await expect(page.getByLabel('Careers Page')).toContainText('#059669');

    const previewSection = page.locator('.preview-section div[themecolor]');
    await expect(previewSection).toHaveAttribute('themecolor', '#059669');
});

test('TC-CP-05 : Verify that if user sets the default color for the Careers Page, it is reflected in the Career Page Preview @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Primary Color', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Careers Page')).toContainText('#059669');
    await page.getByText('#059669').click();
    await page.locator('div:nth-child(4) > .ant-color-picker-color-block-inner').click();
    await expect(page.getByLabel('Careers Page')).toContainText('#DC2626');
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');
    await expect(page.getByLabel('Careers Page')).toContainText('#DC2626');

    const previewSection = page.locator('.preview-section div[themecolor]');
    await expect(previewSection).toHaveAttribute('themecolor', '#dc2626');
});

test('TC-CP-06 : Verify that if user makes any change in the Careers Page Primary Color and cancels the changes, the default color is reflected in the Career Page Preview @regression @careersPage', async ({page}) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Primary Color', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Careers Page')).toContainText('#DC2626');
    await page.getByText('#DC2626').click();
    await page.locator('div:nth-child(7) > .ant-color-picker-color-block-inner').click();
    await expect(page.getByLabel('Careers Page')).toContainText('#059669');
    const previewSection = page.locator('.preview-section div[themecolor]');
    await expect(previewSection).toHaveAttribute('themecolor', '#059669');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.locator('body')).not.toContainText('Careers Page settings saved successfully');
    await expect(page.getByLabel('Careers Page')).toContainText('#DC2626');
    await expect(previewSection).toHaveAttribute('themecolor', '#dc2626');
    await page.waitForTimeout(3000);
});

test('TC-CP-07 : Verify that if user makes any change in the Careers Page Logo and saves the changes, it is reflected in the Career Page Preview @regression @careersPage', async ({ page }, testInfo) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Logo', { exact: true })).toBeVisible();
    const logoImg = page.getByRole('img', { name: 'Company Logo' }).first();
    const logoValue = await logoImg.getAttribute('src');
    console.log('Original logo value: ', logoValue);

    await expect(logoImg).toHaveAttribute('src', logoValue);

    // Capture first logo screenshot for comparison
    const screenshotBefore = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-save-before.png') });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("Change Logo")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(NEW_LOGO);
    await expect(logoImg).not.toHaveAttribute('src', logoValue);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const newLogoValue = await logoImg.getAttribute('src');
    console.log('New logo value: ', newLogoValue);
    await expect(page.getByRole('img', { name: 'Company Logo' }).nth(1)).not.toHaveAttribute('src', logoValue);

    // Capture second logo screenshot and compare with first
    const screenshotAfter = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-save-after.png') });

    const logosAreDifferent = !screenshotBefore.equals(screenshotAfter);
    expect(logosAreDifferent, 'Logo should have changed visually after upload and save').toBe(true);
    console.log('Logo comparison: PASS – logos are visually different (before vs after).');
})

test('TC-CP-08 : Verify that if user sets the default logo for the Careers Page, it is reflected in the Career Page Preview @regression @careersPage', async ({ page }, testInfo) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Logo', { exact: true })).toBeVisible();
    const logoImg = page.getByRole('img', { name: 'Company Logo' }).first();
    const logoValue = await logoImg.getAttribute('src');
    console.log('Original logo value: ', logoValue);

    await expect(logoImg).toHaveAttribute('src', logoValue);

    // Capture first logo screenshot for comparison
    const screenshotBefore = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-before.png') });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("Change Logo")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(LOGO);
    await expect(logoImg).not.toHaveAttribute('src', logoValue);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const newLogoValue = await logoImg.getAttribute('src');
    console.log('New logo value: ', newLogoValue);
    await expect(page.getByRole('img', { name: 'Company Logo' }).nth(1)).not.toHaveAttribute('src', logoValue);

    // Capture second logo screenshot and compare with first
    const screenshotAfter = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-after.png') });

    const logosAreDifferent = !screenshotBefore.equals(screenshotAfter);
    expect(logosAreDifferent, 'Logo should have changed visually after upload and save').toBe(true);
    console.log('Logo comparison: PASS – logos are visually different (before vs after).');
})

test('TC-CP-09 : Verify that if user makes any change in the Careers Page Logo and cancels the changes, the default logo is reflected in the Career Page Preview @regression @careersPage', async ({ page }, testInfo) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Logo', { exact: true })).toBeVisible();
    const logoImg = page.getByRole('img', { name: 'Company Logo' }).first();
    const logoValue = await logoImg.getAttribute('src');
    console.log('Original logo value: ', logoValue);

    await expect(logoImg).toHaveAttribute('src', logoValue);

    // Capture original logo screenshot for comparison (before change + cancel)
    const screenshotBefore = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-cancel-before.png') });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("Change Logo")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(NEW_LOGO);
    const newLogoValue = await logoImg.getAttribute('src');
    console.log('New logo value (before cancel): ', newLogoValue);
    await expect(logoImg).toHaveAttribute('src', newLogoValue);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('body')).not.toContainText('Careers Page settings saved successfully');
    await page.waitForTimeout(2000);
    await expect(logoImg).toHaveAttribute('src', logoValue);
    await expect(page.getByRole('img', { name: 'Company Logo' }).nth(1)).toHaveAttribute('src', logoValue);

    // Capture logo after cancel and compare with original (should be same – reverted)
    const screenshotAfter = await logoImg.screenshot();
    await logoImg.screenshot({ path: testInfo.outputPath('careers-logo-cancel-after.png') });

    const logosReverted = screenshotBefore.equals(screenshotAfter);
    expect(logosReverted, 'Logo should revert to original visually after cancel').toBe(true);
    console.log('Logo comparison: PASS – logo reverted to original after cancel (before and after match).');
})

test('TC-CP-10 : Verify that if user makes any change in the Careers Page About Company Description, it is reflected in the Career Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('About Company', { exact: true })).toBeVisible();
    const aboutCompanyText = page.getByPlaceholder('Tell candidates about your company...');
    await expect(aboutCompanyText).toBeVisible();
    const originalDescription = await aboutCompanyText.inputValue();
    console.log('Original About Company description: ', originalDescription);

    const newDescription = 'We are a leading company in the industry, committed to excellence and innovation.';
    await aboutCompanyText.fill(newDescription);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');
    await expect(aboutCompanyText).toHaveValue(newDescription);

    const previewDescription = page.locator('.preview-section').getByText(newDescription);
    await expect(previewDescription).toBeVisible();
})

test('TC-CP-11 : Verify that if user makes any change in the Careers Page About Company Description and cancels the changes, the default description is reflected in the Career Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('About Company', { exact: true })).toBeVisible();
    const aboutCompanyText = page.getByPlaceholder('Tell candidates about your company...');
    await expect(aboutCompanyText).toBeVisible();
    const originalDescription = await aboutCompanyText.inputValue();
    console.log('Original About Company description: ', originalDescription);

    const newDescription = 'We are a leading company in the industry, committed to AI powered excellence and innovation..';
    await aboutCompanyText.fill(newDescription);
    const previewDescription = page.locator('.preview-section').getByText(newDescription);
    await expect(previewDescription).toBeVisible();
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.scrollIntoViewIfNeeded();
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    //await page.getByRole('button', { name: 'Cancel' }).scrollIntoViewIfNeeded().click();
    await expect(page.locator('body')).not.toContainText('Careers Page settings saved successfully');
    await expect(aboutCompanyText).toHaveValue(originalDescription);
    const revertedPreviewDescription = page.locator('.preview-section').getByText(originalDescription);
    await expect(revertedPreviewDescription).toBeVisible();
})

test('TC-CP-12 : Verify that if user clicks on the Careers Page Preview button, the Careers Page is opened in a new tab @smoke @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await expect(newPage.locator('h1.hiring-title')).toHaveText("We're Hiring", {timeout: 15000});
})

test('TC-CP-13 : Verify that the changes made in the Careers Page are reflected in the Careers Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await page.waitForTimeout(3000);
    const newDescription = 'We are a leading company in the industry, committed to excellence and innovation.';
    const aboutCompanyText = page.getByPlaceholder('Tell candidates about your company...');
    await aboutCompanyText.fill(newDescription);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    await expect(newPage.locator('h1.hiring-title')).toHaveText("We're Hiring", {timeout: 15000});
    const previewDescription = await newPage.locator('.hiring-section').locator('.company-tagline').innerText();
    console.log('Preview About Company description: ', previewDescription);
    await expect(previewDescription).toContain(newDescription);
})

test('TC-CP-14 : Verify that if user set the default Company Description, it is reflected in the Career Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await page.waitForTimeout(3000);
    const defaultDescription = 'Join our innovative team and help shape the future of technology. Work with passionate people, build impactful products, and grow your career. Apply now and be part of something transformative';
    const aboutCompanyText = page.getByPlaceholder('Tell candidates about your company...');
    await aboutCompanyText.fill(defaultDescription);
    await page.getByRole('button', {
        name: 'Save & Publish'
    }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', {
            name: 'Preview'
        }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    await expect(newPage.locator('h1.hiring-title')).toHaveText("We're Hiring", {timeout: 15000});
    const previewDescription = await newPage.locator('.hiring-section').locator('.company-tagline').innerText();
    console.log('Preview About Company description: ', previewDescription);
    await expect(previewDescription).toContain(defaultDescription);
})

test('TC-CP-15 : Verify that if user clicks on the Careers Page Link Copy icon, the Careers Page URL is copied to clipboard @regression @careersPage', async ({ page,context }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Careers Page Link', { exact: true })).toBeVisible();
    const copyButton = page.getByRole('button', { name: 'Copy URL to clipboard' });
    await copyButton.click();

    // Verify that the URL is copied to clipboard
    await context.grantPermissions(
        ['clipboard-read', 'clipboard-write'],
        { origin: 'https://growexx-stg.hirin.ai' }
      );
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('https://growexx-stg.hirin.ai/careers');

})

test('TC-CP-16 : Verify that the user is able to access the Careers Page using the copied URL @smoke @regression @careersPage', async ({ page, context }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByText('Careers Page Link', { exact: true })).toBeVisible();
    const copyButton = page.getByRole('button', { name: 'Copy URL to clipboard' });
    await copyButton.click();

    // Verify that the URL is copied to clipboard
    await context.grantPermissions(
        ['clipboard-read', 'clipboard-write'],
        { origin: 'https://growexx-stg.hirin.ai' }
      );
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('https://growexx-stg.hirin.ai/careers');

    // Open a new page and navigate to the copied URL
    const newPage = await context.newPage();
    await newPage.goto(clipboardText);
    await newPage.waitForLoadState();
    await newPage.waitForTimeout(4000);
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers');
    await expect(newPage.locator('h1.hiring-title')).toHaveText("We're Hiring", {timeout: 15000});
})

//test('TC-CP-17 : Verify that if user tries to access the Careers Page without enabling it, an appropriate message is displayed', async ({ page }) => {)

//test('TC-CP-18 : Verify that if user tries to access the Careers Page with ?preview=true query parameter without enabling the Careers Page, an appropriate message is displayed', async ({ page }) => {)

test('TC-CP-19 : Verify that if user is able to search a job in the Careers Page using the search bar @smoke @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Job Visibility', { exact: true })).toBeVisible();
    const searchBox = page.getByRole('textbox', { name: 'Search...' });

    // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();

    // Now assert it is enabled
    await expect(searchBox).toBeEnabled();
    await page.getByRole('textbox', { name: 'Search...' }).fill(JOB_SEARCH);
    const searchResult = page.locator('.job-item').filter({has: page.locator('.job-title', { hasText: JOB_SEARCH })}).first();
    await expect(searchResult).toBeVisible();
    await expect(searchResult).toContainText(JOB_SEARCH);
    await page.waitForTimeout(3000);
})

test('TC-CP-20 : Verify that if user searches for a job in the Careers Page using the search bar and there is no matching result, appropriate message is displayed @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Job Visibility', { exact: true })).toBeVisible();
    const searchBox = page.getByRole('textbox', { name: 'Search...' });

    // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();
    // Now assert it is enabled
    await expect(searchBox).toBeEnabled();
    await page.getByRole('textbox', { name: 'Search...' }).fill('NonExistingJobTitle');
    const noResultMessage = page.getByText('No jobs found', { exact: true });
    await expect(noResultMessage).toBeVisible();
})

test('TC-CP-21 : Verify that if user clears the search box after searching for a job, all the jobs are displayed in the Careers Page @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Job Visibility', { exact: true })).toBeVisible();
    const searchBox = page.getByRole('textbox', { name: 'Search...' });

    // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();
    // Now assert it is enabled
    await expect(searchBox).toBeEnabled();
    await page.getByRole('textbox', { name: 'Search...' }).fill(JOB_SEARCH);
    const searchResult = page.locator('.job-item').filter({has: page.locator('.job-title', { hasText: JOB_SEARCH })}).first();
    await expect(searchResult).toBeVisible();
    await expect(searchResult).toContainText(JOB_SEARCH);
    // Clear the search box
    await page.locator('svg[data-icon="close-circle"]').click();

    const allJobs = page.locator('.job-item').first();
    await expect(allJobs).toHaveText('Product Owner');
})

test('TC-CP-22 : Verify that if the Enable Careers Page toggle button is on, then user is able to set the toggle to off for Job Visibility for the first job and the changes are reflected in the Careers Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Job Visibility', { exact: true })).toBeVisible();
    const firstJobToggle = page.locator('.job-item').first().getByRole('switch');
    await firstJobToggle.click();
    await expect(firstJobToggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('heading', { name: 'Product Owner' })).not.toBeVisible();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    const firstJob = newPage.getByRole('heading', { name: 'Senior Product Owner' });
    await expect(firstJob).not.toBeVisible();
})

test('TC-CP-23 : Verify that if the Enable Careers Page toggle button is on, then user is able to set the toggle to on for Job Visibility for the first job and the changes are reflected in the Careers Page Preview @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await expect(page.getByRole('switch').first()).toBeEnabled();
    await expect(page.getByText('Job Visibility', { exact: true })).toBeVisible();
    const firstJobToggle = page.locator('.job-item').first().getByRole('switch');
    await firstJobToggle.click();
    await expect(firstJobToggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('heading', { name: 'Product Owner' })).toBeVisible();
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Save & Publish' }).click();
    await expect(page.locator('body')).toContainText('Careers Page settings saved successfully');

    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    const firstJob = newPage.getByRole('heading', { name: 'Product Owner' }).first();
    await expect(firstJob).toBeVisible();
})

test('TC-CP-24 : Verify that if user tries to set the toggle to off for Job Visibility for a job without enabling the Careers Page, an appropriate message is displayed @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await page.getByRole('switch').first().click();
    await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', 'false');
    const searchBox = page.getByRole('textbox', { name: 'Search...' });

     // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();
    const firstJobToggle = page.locator('.job-item').first().getByRole('switch');
    await firstJobToggle.scrollIntoViewIfNeeded();
    await firstJobToggle.hover();
    await expect(firstJobToggle).toBeDisabled();
    await page.waitForTimeout(3000);
})

test('TC-CP-25 : Verify that user is able to search for a job in the Careers Page using the search bar and the search is working correctly when the Enable Careers Page toggle is set as Off @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    await page.getByRole('switch').first().click();
    await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', 'false');
    const searchBox = page.getByRole('textbox', { name: 'Search...' });

     // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await page.getByRole('textbox', { name: 'Search...' }).fill(JOB_SEARCH);
    await page.waitForTimeout(3000);
    const searchResult = page.locator('.job-item').filter({has: page.locator('.job-title', { hasText: JOB_SEARCH })}).first();
    await searchResult.scrollIntoViewIfNeeded();
    await expect(searchResult).toBeVisible();
    await expect(searchResult).toContainText(JOB_SEARCH);
    await page.waitForTimeout(3000);
})

test('TC-CP-26 : Verify that if user is able to search for a job in the Careers Page Preview using the search bar and the search is working correctly @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    const searchBox = newPage.getByRole('textbox', { name: 'Search by job title...' });

     // Scroll the element into view
    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await newPage.getByRole('textbox', { name: 'Search by job title...' }).fill(JOB_SEARCH);
    await newPage.waitForTimeout(3000);
    const searchResult = newPage.getByRole('heading', { name: JOB_SEARCH }).first();
    //const searchResult = newPage.locator('.job-item').filter({has: newPage.locator('.job-title', { hasText: JOB_SEARCH })}).first();
    await searchResult.scrollIntoViewIfNeeded();
    await expect(searchResult).toBeVisible();
    await expect(searchResult).toContainText(JOB_SEARCH);
    await newPage.waitForTimeout(3000);
})


// Career Page public - View Detail/ Apply button //
test('TC-CP-27 : Verify that if user is able to view Details of a Job in Career Page @smoke @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.getByRole('button', { name: 'Preview' }).click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL('https://growexx-stg.hirin.ai/careers?preview=true');
    await newPage.waitForTimeout(4000);
    const searchBox = newPage.getByRole('textbox', { name: 'Search by job title...' });

    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await newPage.getByRole('textbox', { name: 'Search by job title...' }).fill(JOB_SEARCH);
    await newPage.waitForTimeout(3000);

    await expect(newPage.getByRole('heading', { name: JOB_SEARCH }).first()).toBeVisible();

    const viewDetailsButton = newPage.getByText('View Details', { exact: true }).first();
    await viewDetailsButton.scrollIntoViewIfNeeded();
    await viewDetailsButton.click();

    await expect(newPage.getByRole('heading', { name: 'About the Role' })).toBeVisible();
});

test('TC-CP-28 : Verify that if user tries to apply for a job that they have already applied for, an appropriate message is displayed @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    const newPage = await page.context().newPage();
    await newPage.goto('https://growexx-stg.hirin.ai/careers');
    await newPage.waitForLoadState();
    await newPage.waitForTimeout(4000);
    const searchBox = newPage.getByRole('textbox', { name: 'Search by job title...' });

    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await newPage.getByRole('textbox', { name: 'Search by job title...' }).fill(JOB_SEARCH);
    await newPage.waitForTimeout(3000);

    await expect(newPage.getByRole('heading', { name: JOB_SEARCH }).first()).toBeVisible();

    const applyButton = newPage.getByText('Apply Now', { exact: true }).first();
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();
    await expect(newPage.getByRole('heading', { name: `Apply for ${JOB_SEARCH}` })).toBeVisible();
    await newPage.locator('[data-testid="name-input"]').fill(FULL_NAME);
    await newPage.locator('[data-testid="email-input"]').fill(EMAIL);
    await newPage.locator('[data-testid="phone-input"]').fill(PHONE_NUMBER);
    const resumeUploadSection = newPage.locator('[data-testid="resume-upload-section"]');
    await resumeUploadSection.scrollIntoViewIfNeeded();
    const resumeInput = resumeUploadSection.locator('input[type="file"]');
    await resumeInput.setInputFiles(RESUME);
    await newPage.locator('[data-testid="submit-button"]').click();
    const noticeDescription = newPage.locator('.ant-notification-notice-description');
    await expect(noticeDescription).toContainText(
        'You already have an active application for Project Manager 2. Please complete it before applying again.',
        { timeout: 10000 }
    );
})

test('TC-CP-29 : Verify that error message is displayed if user tries to apply for the same job from the Careers Page @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCareers(page);
    const newPage = await page.context().newPage();
    await newPage.goto('https://growexx-stg.hirin.ai/careers');
    await newPage.waitForLoadState();
    await newPage.waitForTimeout(4000);
    const searchBox = newPage.getByRole('textbox', { name: 'Search by job title...' });

    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await newPage.getByRole('textbox', { name: 'Search by job title...' }).fill(JOB_SEARCH1);
    await newPage.waitForTimeout(3000);

    await expect(newPage.getByRole('heading', { name: JOB_SEARCH1 }).first()).toBeVisible();

    const applyButton = newPage.getByText('Apply Now', { exact: true }).first();
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();
    await expect(newPage.getByRole('heading', { name: `Apply for ${JOB_SEARCH1}` })).toBeVisible();
    await newPage.locator('[data-testid="name-input"]').fill(FULL_NAME1);
    await newPage.locator('[data-testid="email-input"]').fill(EMAIL1);
    await newPage.locator('[data-testid="phone-input"]').fill(PHONE_NUMBER1);
    const resumeUploadSection = newPage.locator('[data-testid="resume-upload-section"]');
    await resumeUploadSection.scrollIntoViewIfNeeded();
    const resumeInput = resumeUploadSection.locator('input[type="file"]');
    await resumeInput.setInputFiles(RESUME1);
    await newPage.locator('[data-testid="submit-button"]').click();
    // Message uses curly apostrophe (') in the UI - \u2019 matches it exactly
    await expect(newPage.locator('.ant-notification-notice-description')).toContainText(
        'You\u2019ve already applied for this job',
        { timeout: 10000 }
    );
})

test('TC-CP-30 : Verify that if user is able to Apply for a Job in the Careers Page Preview @smoke @regression @careersPage', async ({ page }, testInfo) => {
    await loginAndNavigateToCareers(page);
    const newPage = await page.context().newPage();
    await newPage.goto('https://growexx-stg.hirin.ai/careers');
    await newPage.waitForLoadState();
    await newPage.waitForTimeout(4000);
    const searchBox = newPage.getByRole('textbox', { name: 'Search by job title...' });

    await searchBox.scrollIntoViewIfNeeded();
    await expect(searchBox).toBeEnabled();
    await newPage.getByRole('textbox', { name: 'Search by job title...' }).fill(JOB_SEARCH2);
    await newPage.waitForTimeout(3000);

    await expect(newPage.getByRole('heading', { name: JOB_SEARCH2 }).first()).toBeVisible();

    const applyButton = newPage.getByText('Apply Now', { exact: true }).first();
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click();
    await expect(newPage.getByRole('heading', { name: `Apply for ${JOB_SEARCH2}` })).toBeVisible();
    await newPage.locator('[data-testid="name-input"]').fill(FULL_NAME2);
    // Unique email avoids "Application Already in Progress" when staging already has EMAIL2 on this job
    const uniqueEmail = `avinashsingh+${testInfo.workerIndex}t${Date.now()}@gmail.com`;
    await newPage.locator('[data-testid="email-input"]').fill(uniqueEmail);
    await newPage.locator('[data-testid="phone-input"]').fill(uniquePhoneNumber2(testInfo));
    const resumeUploadSection = newPage.locator('[data-testid="resume-upload-section"]');
    await resumeUploadSection.scrollIntoViewIfNeeded();
    const resumeInput = resumeUploadSection.locator('input[type="file"]');
    await resumeInput.setInputFiles(RESUME2);
    await newPage.locator('[data-testid="submit-button"]').click();
    // Success may be inline, in ant-notification title/description, or ant-message (wording/casing varies)
    const successInline = newPage.getByText(/Application\s+[Ss]ubmitted\s+Successfully!?/);
    const successToast = newPage
        .locator('.ant-notification-notice-message, .ant-notification-notice-description')
        .filter({ hasText: /application.*submitted.*success|successfully.*submitted|thank you.*application/i });
    const successMessage = newPage.locator('.ant-message-notice-content').filter({ hasText: /application.*submitted|successfully/i });
    await expect(successInline.or(successToast.first()).or(successMessage.first())).toBeVisible({ timeout: 25000 });
})

test('TC-CP-31 : Verify that if user is able to view the details of a candidate who has applied for a job @regression @careersPage', async ({ page }) => {
    await loginAndNavigateToCandidatesReport(page);
    await page.waitForLoadState("networkidle");
    await selectDateRangePreset(page, 'Today');
    await page.waitForTimeout(2000);
    await expect(page.getByText(FULL_NAME2, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(JOB_SEARCH2, { exact: true }).first()).toBeVisible();
})