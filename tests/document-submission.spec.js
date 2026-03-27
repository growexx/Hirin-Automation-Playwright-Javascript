import {test,expect} from '@playwright/test';

const JOB_NAME_PREFIX = 'Project Manager ';
const JOB_TITLE = (
  JOB_NAME_PREFIX +
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20 - JOB_NAME_PREFIX.length)
).slice(0, 20);
const CLIENT_NAME = 'Growexx';
const RESUME = 'data/rajKashyap.pdf';
const EMAIL = 'rajkashyap@gmail.com';
const AADHAR = 'data/aadhar_card.pdf';
const PAN ='data/pan_card.jpg';
const SALARYSLIP = 'data/salary_slip.pdf';
const FIRST_NAME = 'Raj';
/** Same value as filled in the Add Candidate drawer (table shows full name). */
const CANDIDATE_FULL_NAME = 'Raj Kashyap';
const PHONE_NUMBER = '+91 9876543210';

/**
 * Jobs → Candidates tab: the blue name is often Ant Design `Button type="link"` → role **button**, not **link**.
 * Prefer cells / button / anchor scoped to the `.ant-table` that contains the candidate name.
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
function jobsTableCandidateName(page) {
  const shortName = new RegExp(FIRST_NAME, 'i');
  const fullName = new RegExp(
    CANDIDATE_FULL_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  );

  const table = page.locator('.ant-table').filter({ hasText: fullName });

  const inCell = table.locator('.ant-table-cell, td').filter({ hasText: fullName }).first();
  const asLinkButton = table.getByRole('button', { name: shortName }).first();
  const asAnchor = table.getByRole('link', { name: shortName }).first();
  const byTestId = table.locator('[data-testid="candidate-name"]').first();

  return inCell.or(asLinkButton).or(asAnchor).or(byTestId);
}
const EMAIL_PREFIX = EMAIL.split('@')[0];

async function goToJob(page) {
    await page.waitForTimeout(5000);
    //await expect(page.locator('div').filter({hasText: /^Jobs$/})).toBeVisible();
    await expect(page.getByText('Jobs', { exact: true })).toBeVisible();
    await page.getByText('Jobs', { exact: true }).click();
    //await page.locator('div').filter({ hasText: /^Jobs$/}).click();
}

async function removeChatIframe(page) {
    await page.evaluate(() => {
        const fcFrame = document.querySelector('#fc_frame');
        if (fcFrame) {
            fcFrame.remove();
        }
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
    await removeChatIframe(page);

    await page.locator('#file-upload').setInputFiles(filePath);
    await page.waitForTimeout(3000);

    await expect(page.locator('img[src="/Success-upload.svg"][alt="upload_file"]')).toBeVisible();
    await expect(page.locator('span.ant-typography', {hasText: firstName})).toBeVisible();
}

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

test('Create job with Master Flow + Document Submission @smoke @regression @documentSubmission', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('button', {name: 'plus Create Job'}).click();
    await page.getByRole('textbox', {name: /Write Job Title Here/i}).fill(JOB_TITLE);
    await removeIframe(page);

    await page.getByText('Create Job Description with Zena').click();
    await page.getByRole('textbox', {name: /Write a brief/i}).fill('Project Manager with 5+ years experience');
    await removeChatIframe(page);
    await page.getByText('Create', {exact: true}).click();

    await page.getByText('Hiring for').scrollIntoViewIfNeeded();
    await page.locator('#rc_select_3').click();
    await page.locator('.ant-select-item-option-content', {hasText: CLIENT_NAME}).click();

    const spinbuttons = page.locator('input[role="spinbutton"]');
    await spinbuttons.nth(0).scrollIntoViewIfNeeded();
    await expect(page.getByRole('dialog')).toContainText('No. of Questions:');
    await expect(spinbuttons.nth(0)).toHaveValue('1');
    await spinbuttons.nth(0).fill('5');
    await page.mouse.click(0, 0);
    await expect(spinbuttons.nth(0)).toHaveValue('5');

    await expect(page.getByRole('dialog')).toContainText('Interview Duration (in mins):');
    await expect(spinbuttons.nth(1)).toHaveValue('5');
    await page.waitForTimeout(3000);
    await spinbuttons.nth(1).fill('15');
    await page.waitForTimeout(3000);
    await page.mouse.click(0, 0);
    await expect(spinbuttons.nth(1)).toHaveValue('15');

    await page.getByRole('button', {name: 'Next Arrow'}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Key Skills')).toBeVisible();
    await expect(page.getByTestId('generate-questions-button')).toBeEnabled({timeout: 10000});

    await page.getByTestId('generate-questions-button').click();
    await expect(page.getByTestId('question-checkbox').first()).toBeVisible({timeout: 30000});
    await expect(page.getByTestId('question-checkbox')).toHaveCount(5, {timeout: 15000});

    await expect(page.getByRole('button', {name: 'Next Arrow'})).toBeEnabled();
    await page.getByRole('button', {name: 'Next Arrow'}).click();

    await expect(page.locator(`[data-testid='select-workflow']`)).toBeVisible();
    await page.locator(`[data-testid='select-workflow']`).click();
    await page.getByText('Master Flow + Document Submission', {exact: true}).click();

    // Trigger Whatsapp Template: click first "SDE1" (span next to label), select Project Manager, then Select
    await page.getByText('SDE1', {exact: true}).first().click();
    await page.getByRole('radio', {name: /Project Manager/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();

    // Schedule HM Round with – first option: select Riya.singh, then Select
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).first().click();
    await page.getByRole('radio', {name: /Riya\.singh/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();

    // Schedule HM Round with – second option: select Super Admin, then Select
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).click();
    await page.getByRole('radio', {name: /Super Admin/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(`"${JOB_TITLE}" position has been successfully added.`)).toBeVisible();

    await page.waitForTimeout(4000);

});

test('Add Candidate to the Master Flow + Document Submission workflow job created @smoke @regression @documentSubmission', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await uploadCandidate(page, RESUME, FIRST_NAME);
    await page.getByTestId('next-button').click();
    await expect(page.getByRole('link', {name: new RegExp('Raj', 'i')})).toBeVisible();

    await page.locator('[data-testid="candidate-name"]').click();
    await page.getByRole('textbox', { name: 'Name' }).fill(CANDIDATE_FULL_NAME);
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER);
    await page.click('body');

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE}`, 'i'))).toBeVisible();

    // List often does not refresh until reload (same pattern as later tests).
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
});

test('Manually update the candidate interview status for the candidate added in Master Flow + Document Submission workflow job created @smoke @regression @documentSubmission', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();

    await expect(jobsTableCandidateName(page)).toBeVisible();
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('Stage: CV Screening Pending', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: CV Screening Pending').click();
    await page.getByText('Move to Recruiter Screening').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Recruiter Screening"');

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Candidate Response Awaiting')).toBeVisible();

    await expect(page.getByText('Stage: Candidate Response Awaiting', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: Candidate Response Awaiting').click();
    await page.getByText('Move to AI Interview').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();    
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "AI Interview"');

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: AI Interview Awaiting')).toBeVisible();

    await page.getByText('Stage: AI Interview Awaiting').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round"');

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round Review Pending').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round 2"');

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round 2 Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round 2 Review Pending').click();
    await page.getByText('Move to Select Candidate', { exact: true }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Candidate is selected');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Select Candidate"', { timeout: 35000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Document Submission Pending')).toBeVisible();
    await page.waitForTimeout(2000);
});

test('Open Yopmail,navigate to Document upload screen and upload the document @smoke @regression @documentSubmission', async ({page,context}) =>  {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();

    await expect(jobsTableCandidateName(page)).toBeVisible();
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText(EMAIL)).toBeVisible();

    const page1 = await context.newPage();
    await page1.goto('https://yopmail.com/');
    await page1.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX}@yopmail.com`);
    await page1.getByTitle('Check Inbox @yopmail.com').click();
    await page1.locator('iframe[name="ifinbox"]').waitFor({ state: 'attached', timeout: 10000 });
    const inboxFrame = page1.locator('iframe[name="ifinbox"]').contentFrame();

    await expect(inboxFrame.getByRole('button', { name: /info@hirin\.ai Action Required: Upload/ }).first()).toBeVisible({ timeout: 15000 });
    await inboxFrame.getByRole('button', { name: /info@hirin\.ai Action Required: Upload/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Action Required: Upload Your Documents to Complete the Hiring Process');
    await page1.waitForTimeout(4000);
   // await expect(page.locator('iframe[name="ifmail"]').contentFrame().getByRole('link')).toContainText('Document Upload Portal');
    //await page.locator('iframe[name="ifmail"]').contentFrame().getByRole('link', { name: 'Document Upload Portal' }).click();

    // Document Upload Portal link is inside Yopmail's ifmail iframe on page1, not on the Hirin app (page)
    const page1Promise = page1.waitForEvent('popup');
    await page1.frameLocator('#ifmail').getByRole('link', { name: 'Document Upload Portal' }).click();
    const page2 = await page1Promise;
    await expect(page2.getByRole('heading', { name: 'Complete Your Document Submission' })).toBeVisible();
    await expect(page2.getByRole('main')).toContainText('Aadhaar Card');
    await page2.getByText('Pending').first().click();
    await page2.getByText('Required').nth(1).click();
    // setInputFiles requires input[type="file"]; the upload buttons are not file inputs
    await page2.locator('input[type="file"]').first().setInputFiles(AADHAR);
    await page2.locator('input[type="file"]').nth(1).setInputFiles(PAN);
    await page2.locator('input[type="file"]').nth(2).setInputFiles(SALARYSLIP);
    await expect(page2.getByRole('button', { name: '✓ Submit Documents' })).toBeEnabled({ timeout: 60000 });
    await page2.getByRole('button', { name: '✓ Submit Documents' }).click();
    await expect(page2.locator('body')).toContainText('All Done');
    await expect(page2.locator('body')).toContainText('Your documents have been successfully submitted');
});

test('Submitted documents status is updated in the candidate details page @smoke @regression @documentSubmission', async ({page}) =>  {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();

    await expect(jobsTableCandidateName(page)).toBeVisible();
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText(/Stage: Document Awaiting Review/)).toBeVisible({ timeout: 10000 });
});
