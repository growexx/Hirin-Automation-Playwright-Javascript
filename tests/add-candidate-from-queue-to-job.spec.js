import {test,expect} from '@playwright/test';
import path from 'path';

const projectRoot = process.cwd();
const CLIENT_NAME = 'Growexx';
const CANDIDATE_TO_BE_ADDED = 'Arpita Yadav';
const CANDIDATE_TO_BE_REMOVED = 'Ankit Kumar';
const JOB_NAME = 'Product Owner';

async function loginAndNavigateToCandidatesPage(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    const candidatesNav = page.locator('div.menu-item').filter({ hasText: /^Candidates$/ }).first();
    await expect(candidatesNav).toBeVisible({ timeout: 15000 });
    await candidatesNav.click();
}
// Manual action needed for MFA verification
test('Login to outlook and send email  @regression @addCandidateFromQueue', async ({page}) => {
    test.setTimeout(150000);
    await page.goto('https://login.microsoftonline.com/');
    await page.getByRole('textbox', { name: 'Enter your email, phone, or' }).click();

    // Email from env so it's not in source or trace (set OUTLOOK_EMAIL in .env or shell)
    const outlookEmail = process.env.OUTLOOK_EMAIL;
    if (!outlookEmail) throw new Error('Set OUTLOOK_EMAIL env var (e.g. in .env) to run this test');    
    await page.getByRole('textbox', { name: 'Enter your email, phone, or' }).fill(outlookEmail);
    await page.getByRole('button', { name: 'Next' }).click();

    // Password from env so it's not in source or trace (set OUTLOOK_PASSWORD in .env or shell)
    const outlookPassword = process.env.OUTLOOK_PASSWORD;
    if (!outlookPassword) throw new Error('Set OUTLOOK_PASSWORD env var (e.g. in .env) to run this test');
    await page.getByRole('textbox', { name: 'Enter the password for bikash' }).click();
    await page.getByRole('textbox', { name: 'Enter the password for bikash' }).fill(outlookPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(10000);// Manually accept the 2FA prompt on the phone
    await page.getByText('Don\'t show this again').click();
    await page.getByRole('button', { name: 'Yes' }).click();

    await page.goto('https://outlook.office.com/mail/inbox');
    await page.getByText('Sent Items', { exact: true }).nth(1).click();
    await page.getByText('Applying for Product Owner', { exact: true }).first().click();
    await page.getByRole('menuitem', { name: 'Forward' }).nth(0).click();
    await page.getByLabel('To', { exact: true }).fill(outlookEmail);
    await page.getByPlaceholder('Add a subject').fill(`Applying for ${JOB_NAME} position`);
    await page.getByLabel('Send', { exact: true }).click();
    await page.waitForTimeout(25000);
})

test('Add candidate to a job from Queue - Cancel the action @regression @addCandidateFromQueue', async ({page}) => {
    
    await loginAndNavigateToCandidatesPage(page);
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();

    const row = page.locator('tr', {has: page.locator('[data-testid="candidate-name"]', { hasText: CANDIDATE_TO_BE_ADDED })});

    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').click();
    await expect(row.getByText('Product Owner')).toBeVisible();
    await row.locator('.ant-select').filter({ hasText: 'Select Source' }).click();
    await page.locator('div').filter({ hasText: /^Naukri$/ }).nth(1).click();
    
    await page.getByRole('button', { name: 'Add Candidates', exact: true }).click();
    await expect(page.getByLabel('Preview')).toContainText('Add selected candidate(s)?');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(5000);
})

test('Add candidate to a job from Queue - Confirm the action  @regression @addCandidateFromQueue', async ({page}) => {
    await loginAndNavigateToCandidatesPage(page);
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();

    const row = page.locator('tr', {has: page.locator('[data-testid="candidate-name"]', { hasText: CANDIDATE_TO_BE_ADDED })});

    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').click();
    await expect(row.getByText('Product Owner')).toBeVisible();
    await row.locator('.ant-select').filter({ hasText: 'Select Source' }).click();
    await page.locator('div').filter({ hasText: /^Naukri$/ }).nth(1).click();
    
    await page.getByRole('button', { name: 'Add Candidates', exact: true }).click();
    await expect(page.getByLabel('Preview')).toContainText('Add selected candidate(s)?');
    await page.getByRole('button', { name: 'Yes, Add' }).click();
    await expect(page.getByText('The selected candidate has been successfully added to the job position')).toBeVisible();
    await page.reload();
    await page.waitForTimeout(5000);
    const row1 = page.locator('tr', {has: page.locator('text=' + CANDIDATE_TO_BE_ADDED)});
    const jobPosition = row1.locator('td').nth(1); // second column
    const appliedOn = row1.locator('td').nth(4); // third column
      
    await expect(jobPosition).toHaveText(JOB_NAME);
    await expect(appliedOn).toHaveText(new Date().toLocaleDateString('en-GB'));

    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();
    await expect(row).toBeHidden();
    await page.waitForTimeout(3000);
    await page.getByRole('img', { name: 'close' }).click();
    await expect(page.getByText('Are you sure you want to leave?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, Close' }).click();
    await page.waitForTimeout(3000);

    await jobPosition.click();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: 'Product Owner' })).toBeVisible();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.locator('span.candidate-name', {hasText: CANDIDATE_TO_BE_ADDED})).toBeVisible();
    
    await page.waitForTimeout(5000);
})

test('Remove candidate from a job from Queue - Cancel the action @regression @addCandidateFromQueue', async ({page}) => {
    await loginAndNavigateToCandidatesPage(page);
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();

    const row = page.locator('tr', {has: page.locator('[data-testid="candidate-name"]', { hasText: CANDIDATE_TO_BE_REMOVED })});

    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').click();
    await expect(row.getByText('Product Owner')).toBeVisible();
    await row.locator('.ant-select').filter({ hasText: 'Select Source' }).click();
    await page.locator('div').filter({ hasText: /^Naukri$/ }).nth(1).click();
    
    await page.getByRole('button', { name: 'Remove from Queue' }).click();
    await expect(page.getByLabel('Preview')).toContainText('Remove selected candidate(s)?');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(5000);
})

test('Remove candidate from a job from Queue - Confirm the action  @regression @addCandidateFromQueue', async ({page}) => {
    await loginAndNavigateToCandidatesPage(page);
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();

    const row = page.locator('tr', {has: page.locator('[data-testid="candidate-name"]', { hasText: CANDIDATE_TO_BE_REMOVED })});

    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').click();
    await expect(row.getByText('Product Owner')).toBeVisible();
    await row.locator('.ant-select').filter({ hasText: 'Select Source' }).click();
    await page.locator('div').filter({ hasText: /^Naukri$/ }).nth(1).click();
    
    await page.getByRole('button', { name: 'Remove from Queue' }).click();
    await expect(page.getByLabel('Preview')).toContainText('Remove selected candidate(s)?');
    await page.getByRole('button', { name: 'Yes, Remove' }).click();
    await expect(page.getByText('The selected candidate has been removed from the queue.')).toBeVisible();
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();
    await expect(row).toBeHidden();
    await page.waitForTimeout(5000);
})

test('Remove all candidate from Queue - Confirm the action', async ({page}) => {
    await loginAndNavigateToCandidatesPage(page);
    await expect(page.getByText('Candidates in Queue')).toBeVisible({ timeout: 10000 });
    await page.getByText('Candidates in Queue').click();

    await page.locator('input[type="checkbox"]').first().click();
    
    await page.getByRole('button', { name: 'Remove from Queue' }).click();
    await expect(page.getByLabel('Preview')).toContainText('Remove selected candidate(s)?');
    await page.getByRole('button', { name: 'Yes, Remove' }).click();
    await expect(page.getByText('All selected candidates have been removed from the queue.')).toBeVisible();
    await expect(page.getByText('Candidates in Queue')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(5000);
})

