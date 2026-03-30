const { test, expect } = require('@playwright/test');

const CLIENT_NAME = 'Growexx';
const JOB_TITLE = 'Mern Developer';
const RESUME = 'data/rajKashyap.pdf';
//const FIRST_NAME = 'Raj';
const FIRST_NAME = 'Umesh';
const EMAIL = 'rajkashyap@gmail.com';
//const CANDIDATE_FULL_NAME = 'Raj Kashyap';
const CANDIDATE_FULL_NAME = 'Umesh Kumar Prasad';
const PHONE_NUMBER = '+91 9876543210';
const EMAIL_PREFIX = EMAIL.split('@')[0];

async function loginAndNavigateToCreateJob(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await page.getByText('Jobs', { exact: true }).click();

}

async function loginAndNavigateToCreateJobAsRecruiter(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('bikash.m@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

}

async function removeIframe(page) {
    await page.evaluate(() => {
        document.querySelector('#fc_frame')?.remove();
    });
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

async function offerReleaseWorkflowSelected(page) {
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
    await page.getByText('Master Flow + Document Submission + Offer Release', { exact: true }).click();
}

async function completeOfferReleaseWorkflow(page) {
    await expect(page.getByText('Select Hiring Manager(s)', { exact: true }).first()).toBeVisible();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).first().click();
    await page.getByRole('radio', {name: /Riya\.singh/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await expect(page.getByText('Riya.singh')).toBeVisible();

    await expect(page.getByText('Select Hiring Manager(s)', { exact: true })).toBeVisible();
    await page.getByText('Select Hiring Manager(s)', { exact: true }).scrollIntoViewIfNeeded();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).click();
    await page.getByRole('radio', {name: /Super Admin/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await page.locator(`span:has-text("Super Admin")`).scrollIntoViewIfNeeded();
    await expect(page.locator(`span:has-text("Super Admin")`)).toBeVisible();

    await expect(page.getByText('Select HR Manager', { exact: true })).toBeVisible();
    await page.getByText('Select HR Manager', { exact: true }).click();
    await page.getByRole('radio', { name: 'John Doe'}).first().click();
    await page.getByRole('button', {name: 'Select'}).click();
    await page.locator(`span:has-text("John Doe")`).scrollIntoViewIfNeeded();
    await expect(page.locator(`span:has-text("John Doe")`)).toBeVisible();

    await page.getByRole('button', {name: 'Done'}).click();
}


async function offerReleaseUIValidation(page) {

    const workflow = page.locator('[data-testid="workflow-builder"]');
    await expect(workflow).toBeVisible();

    const workflowTextExpectations = [
        'START WHEN',
        'New Candidate Applied',
        'DO THIS',
        'CV Screening',
        /AI Recruiter Screening\s*-\s*SDE1/,
        'WhatsApp',
        'AI Call',
        'Invite candidate for AI Interview',
        /Schedule HM Round with\s*-\s*Select Hiring Manager\(s\)/,
        'CHECK IF...',
        'Candidate is Selected',
        'Trigger Document Submission (Before Offer)',
        /Schedule Offer Call with\s*-\s*Select (HR|Hiring) Manager/,
        'Release Offer Letter',
        'Joined',
    ];
    for (const expected of workflowTextExpectations) {
        await expect(workflow).toContainText(expected);
    }
}

async function offerReleaseUIValidationAfterHMRound(page) {

    const workflow = page.locator('[data-testid="workflow-builder"]');
    await expect(workflow).toBeVisible();

    const workflowTextExpectations = [
        'DO THIS',
        /Schedule HM Round with\s*-\s*Riya\.singh/,
        'CHECK IF...',
        'Candidate is Selected',
        'Trigger Document Submission (Before Offer)',
        /Schedule Offer Call with\s*-\s*John Doe/,
        'Release Offer Letter'
    ];
    for (const expected of workflowTextExpectations) {
        await expect(workflow).toContainText(expected);
    }
}

async function addCandidateToTheJob(page, filePath, firstName) {
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

    await page.getByTestId('next-button').click();
   // await expect(page.getByRole('link', {name: new RegExp(firstName, 'i')})).toBeVisible();

    await page.locator('[data-testid="candidate-name"]').click();
    await page.getByRole('textbox', { name: 'Name' }).fill(CANDIDATE_FULL_NAME);
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER);
    await page.click('body');

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE}`, 'i'))).toBeVisible();
}

async function moveCandidateToDifferentStage(page) {
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
    await page.getByText('Move to HM Round 2').click();
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


}

/**
 * Opens Yopmail, opens the upload email, clicks "Document Upload Portal", and returns the new popup tab.
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function openYopmailAndCheckInbox(context) {
    const yopmailPage = await context.newPage();
    await yopmailPage.goto('https://yopmail.com/');
    await yopmailPage.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX}@yopmail.com`);
    await yopmailPage.getByTitle('Check Inbox @yopmail.com').click();
    await yopmailPage.locator('iframe[name="ifinbox"]').waitFor({ state: 'attached', timeout: 10000 });
    const inboxFrame = yopmailPage.locator('iframe[name="ifinbox"]').contentFrame();

    await expect(inboxFrame.getByRole('button', { name: /info@hirin\.ai Action Required: Upload/ }).first()).toBeVisible({ timeout: 15000 });
    await inboxFrame.getByRole('button', { name: /info@hirin\.ai Action Required: Upload/ }).first().click();
    await expect(
        yopmailPage.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')
    ).toContainText('Action Required: Upload Your Documents to Complete the Hiring Process');
    await yopmailPage.waitForTimeout(4000);

    const popupPromise = yopmailPage.waitForEvent('popup');
    await yopmailPage.frameLocator('#ifmail').getByRole('link', { name: 'Document Upload Portal' }).click();
    return await popupPromise;
}


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


// HIR - 4178 //
test('TC-OM-01 : Ensure the workflow is displayed correctly on the UI.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await offerReleaseWorkflowSelected(page);
    await offerReleaseUIValidation(page);
});

test('TC-OM-02 : Ensure buttons are clearly visible and accessible.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await offerReleaseWorkflowSelected(page);
    await expect(page.getByText('SDE1', { exact: true })).toBeVisible();
    await expect(page.getByText('Select Hiring Manager(s)', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Select Hiring Manager(s)', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Select HR Manager', { exact: true })).toBeVisible();
    await expect(page.locator(`span:has-text("Back")`)).toBeVisible();

    await page.getByText('SDE1', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI Recruiter Screening' })).toBeVisible();

    await page.getByText('Select Hiring Manager(s)', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Select Hiring Manager' })).toBeVisible();

    await page.getByText('Select Hiring Manager(s)', { exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Select Hiring Manager' })).toBeVisible();

    await page.getByText('Select HR Manager', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select HR Manager' })).toBeVisible();
});

test('TC-OM-03 : Test the interaction of drop-down lists in the UI.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await offerReleaseWorkflowSelected(page);
    await expect(page.getByText('SDE1', { exact: true })).toBeVisible();
    await page.getByText('SDE1', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'AI Recruiter Screening' })).toBeVisible();
    await page.getByText('Team Lead', { exact: true }).click();
    await expect(page.getByText('Team Lead', { exact: true }).first()).toBeVisible();

    await expect(page.getByText('Select Hiring Manager(s)', { exact: true }).first()).toBeVisible();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).first().click();
    await page.getByRole('radio', {name: /Riya\.singh/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await expect(page.getByText('Riya.singh')).toBeVisible();

    await expect(page.getByText('Select Hiring Manager(s)', { exact: true })).toBeVisible();
    await page.getByText('Select Hiring Manager(s)', { exact: true }).scrollIntoViewIfNeeded();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).click();
    await page.getByRole('radio', {name: /Super Admin/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await page.locator(`span:has-text("Super Admin")`).scrollIntoViewIfNeeded();
    await expect(page.locator(`span:has-text("Super Admin")`)).toBeVisible();

    await expect(page.getByText('Select HR Manager', { exact: true })).toBeVisible();
    await page.getByText('Select HR Manager', { exact: true }).click();
    await page.getByRole('radio', { name: 'John Doe'}).first().click();
    await page.getByRole('button', {name: 'Select'}).click();
    await page.locator(`span:has-text("John Doe")`).scrollIntoViewIfNeeded();
    await expect(page.locator(`span:has-text("John Doe")`)).toBeVisible();

    await expect(page.locator(`span:has-text("Back")`)).toBeVisible();
    await page.getByRole('button', {name: 'Back'}).click();
    await page.waitForTimeout(3000);
});

test('TC-OM-04 : Test for proper error messaging when required fields are missing.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await offerReleaseWorkflowSelected(page);
    await page.getByRole('button', {name: 'Done'}).click();
    await expect(page.getByText('Please select hiring manager(s)')).toBeVisible();

    await expect(page.getByText('Select Hiring Manager(s)', { exact: true }).first()).toBeVisible();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).first().click();
    await page.getByRole('radio', {name: /Riya\.singh/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await expect(page.getByText('Riya.singh')).toBeVisible();

    await page.getByRole('button', {name: 'Done'}).click();
    await expect(page.getByText('Please select hiring manager(s)')).toBeVisible();

    await expect(page.getByText('Select Hiring Manager(s)', { exact: true })).toBeVisible();
    await page.getByText('Select Hiring Manager(s)', { exact: true }).scrollIntoViewIfNeeded();
    await page.locator('span', {hasText: 'Select Hiring Manager(s)'}).click();
    await page.getByRole('radio', {name: /Super Admin/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();
    await page.locator(`span:has-text("Super Admin")`).scrollIntoViewIfNeeded();
    await expect(page.locator(`span:has-text("Super Admin")`)).toBeVisible();

    await page.getByRole('button', {name: 'Done'}).click();
    await expect(page.getByText('Please select HR manager')).toBeVisible();

});

test('TC-OM-05 : Create a new job with Offer Release workflow', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await offerReleaseWorkflowSelected(page);
    await completeOfferReleaseWorkflow(page);
    await expect(page.getByText('"Mern Developer" position has been successfully added.')).toBeVisible();
    await page.waitForTimeout(3000);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-4').click();
    await expect(page.getByText('Master Flow + Document Submission + Offer Release', { exact: true })).toBeVisible();
});


// HIR - 3910 //
test('TC-OM-06 : Verify that the "Offer Call" step appears after the HM round and before Offer Released.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-4').click();
    await expect(page.getByText('Master Flow + Document Submission + Offer Release', { exact: true })).toBeVisible();
    await offerReleaseUIValidationAfterHMRound(page);
});

test('TC-OM-07 : Add a candidate to the job with Offer Release workflow', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-4').click();
    await expect(page.getByText('Master Flow + Document Submission + Offer Release', { exact: true })).toBeVisible();
    await addCandidateToTheJob(page, RESUME, FIRST_NAME);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
});

test('TC-OM-08 : Move a candidate to different stage in the job with Offer Release workflow', async ({ page, context }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    // await page.reload();
    // await page.locator('#rc-tabs-0-tab-4').click();
    // await expect(page.getByText('Master Flow + Document Submission + Offer Release', { exact: true })).toBeVisible();
    // await addCandidateToTheJob(page, RESUME, FIRST_NAME);
    // await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await moveCandidateToDifferentStage(page);
    await openYopmailAndCheckInbox(context);
    
});

test('TC-OM-09 : Verify that a candidate is automatically moved to the "Offer Call Schedule Pending" stage after documents are approved.', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('Stage: Document Submission Pending', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: Document Submission Pending').click();
    await page.getByText('Move to Offer Call').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Call"');

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Offer Call Schedule Pending' })).toBeVisible();
});

test('TC-OM-10 : Verify To-Do List Entry for Offer Call Schedule Pending', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.locator(`span:has-text("Today")`).click();
    await page.locator(`span:has-text("Done")`).click();
    await expect(page.getByRole('heading', { name: 'To-Do List' })).toBeVisible();
    await page.getByText('To-Do List').scrollIntoViewIfNeeded();
    await expect(page.getByText(`Offer Call Schedule Required - ${CANDIDATE_FULL_NAME} for ${JOB_TITLE} role`, { exact: true }).first()).toBeVisible();
});

test(`TC-OM-11 : Verify that the candidate's status changes to "Offer Call Scheduled" once the offer call has been scheduled.`, async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();
    await page.getByRole('textbox', { name: 'Select date' }).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatted = tomorrow.toISOString().split('T')[0];
    await page.locator(`td.ant-picker-cell[title="${formatted}"]`).click();

    await page.locator('li.ant-picker-time-panel-cell[data-value="16"]').first().click();
    await page.locator(`span:has-text("OK")`).click();
    await page.locator(`span:has-text("Send Invite")`).click()
    await expect(page.locator('body')).toContainText(
      `The invite for the offer call has been successfully sent to ${CANDIDATE_FULL_NAME}`
    );

    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Offer Call Scheduled' })).toBeVisible();
});


// HIR - 4128 //
test('TC-OM-12 : Verify Offer Call Stage Visibility in Different User Roles', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Offer Call Scheduled', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Offer Call Scheduled', { exact: true }).last()).toBeVisible();

    await page.locator(`span:has-text("Logout")`).click();
    await expect(page.locator(`p:has-text("Log Out of Hirin.ai?")`)).toBeVisible({ timeout: 5000 });
    await page.locator(`span:has-text("Logout")`).nth(1).click();


    await loginAndNavigateToCreateJobAsRecruiter(page);
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Offer Call Scheduled', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Offer Call Scheduled', { exact: true }).last()).toBeVisible();
});

test('TC-OM-13 : Verify "Offer Call Schedule Pending" Dashboard Card Visibility', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
});

test('TC-OM-14 : Verify "Offer Call Scheduled" Dashboard Card Visibility', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.locator('[data-testid="status-card-Offer Call Scheduled"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="status-card-Offer Call Scheduled"]').last()).toBeVisible();
    await expect(page.locator('[data-testid="status-card-Offer Call Scheduled"]')).toHaveCount(2);
});

test('TC-OM-15 : Verify Recent Activity Entry for Offer Call Scheduling', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.locator(`span:has-text("Today")`).click();
    await page.locator(`span:has-text("Done")`).click();
    await expect(page.locator('[data-testid="last-actions-title"]')).toBeVisible();
    await page.locator('[data-testid="last-actions-title"]').scrollIntoViewIfNeeded();
    await expect(page.getByText(`Super Admin Scheduled the Offer Call of ${CANDIDATE_FULL_NAME} for ${JOB_TITLE} role`, { exact: true }).first()).toBeVisible();
});

test('TC-OM-16 : Verify Job Details → Insights Tab Visibility for Offer Call Stages', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-1').click();
    const offerCallStageName = page
      .locator('.stage-name')
      .filter({ hasText: 'Offer Call Scheduled' });
    await expect(offerCallStageName).toContainText('Offer Call Scheduled');

    const stageValue = offerCallStageName.locator('xpath=..').locator('.stage-value');
    await expect(stageValue).toHaveText('1');
});

test('TC-OM-17 : Verify Automatic Removal of To-Do Item After Offer Call Scheduling', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Call Schedule Pending', { exact: true }).first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Start date' }).click();
    await page.locator(`span:has-text("Today")`).click();
    await page.locator(`span:has-text("Done")`).click();
    await expect(page.getByRole('heading', { name: 'To-Do List' })).toBeVisible();
    await page.getByText('To-Do List').scrollIntoViewIfNeeded();
    await expect(page.getByText(`Offer Call Schedule Required - ${CANDIDATE_FULL_NAME} for ${JOB_TITLE} role`, { exact: true }).first()).not.toBeVisible();
});

// HIR - 4049 //
test('TC-OM-18 : Verify Offer Call Scheduling Fields', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();

    await expect(page.locator('.other-attendees-selector')).toBeVisible();
    await page.locator('.other-attendees-selector').click();
    await expect(page.locator(`label:has-text("Riya.singh")`)).toBeVisible();
    await page.getByText('HR Manager', { exact: true }).click();

    await expect(page.getByRole('textbox', { name: 'Select date' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Select date' }).click();
    await expect(page.locator('.ant-picker-date-panel')).toBeVisible();
    await expect(page.locator(`.ant-picker-time-panel`)).toBeVisible();
    await page.getByText('Start Date and Time', { exact: true }).first().click();

    await expect(page.locator(`span[title="Virtual"]`)).toBeVisible();
    await page.locator(`span[title="Virtual"]`).click();

    await expect(page.locator('.ant-select-item-option', { hasText: 'Virtual' })).toBeVisible();
  
    await expect(page.locator('.ant-select-item-option', { hasText: 'In Person' })).toBeVisible();
});

test('TC-OM-19 : Verify Attendees Selector for Offer Call', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();

    await expect(page.locator('.other-attendees-selector')).toBeVisible();
    await page.locator('.other-attendees-selector').click();
    await page.locator(`label:has-text("Riya.singh")`).click();
    await page.locator(`label:has-text("Super Admin")`).click();

    await expect(page.locator('.custom-value-container')).toHaveText('Riya.singh and 1 other');
});

test('TC-OM-20 : Verify Call Type Selector (Virtual/In-Person)', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();

    const interviewTypeMenu = page.locator('.ant-select-dropdown').last();

    await expect(page.locator('span[title="Virtual"]')).toBeVisible();
    await page.locator('span[title="Virtual"]').click();
    await expect(interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'Virtual' })).toBeVisible();
    await expect(interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'In Person' })).toBeVisible();

    await interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'In Person' }).click();
    await expect(page.locator('span[title="In Person"]')).toBeVisible();

    await page.locator('span[title="In Person"]').click();
    await expect(interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'Virtual' })).toBeVisible();
    await expect(interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'In Person' })).toBeVisible();
    await interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'Virtual' }).click();
    await expect(page.locator('span[title="Virtual"]')).toBeVisible();
});

test('TC-OM-21 : Verify Office Location for In-Person Call Type', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();

    const interviewTypeMenu = page.locator('.ant-select-dropdown').last();

    await expect(page.locator('span[title="Virtual"]')).toBeVisible();
    await page.locator('span[title="Virtual"]').click();
    await interviewTypeMenu.locator('.ant-select-item-option', { hasText: 'In Person' }).click();
    await expect(page.locator('span[title="In Person"]')).toBeVisible();

    const interviewLocationSelect = page.locator('.ant-select').filter({
      has: page.locator('.ant-select-selection-placeholder', { hasText: 'Select interview location...' })
    });
    await expect(interviewLocationSelect.locator('.ant-select-selection-placeholder')).toHaveText(
      'Select interview location...'
    );
    await interviewLocationSelect.locator('.ant-select-selector').click();

    const locationDropdown = page.locator('.ant-select-dropdown').last();
    await expect(locationDropdown.locator('.ant-select-item-option-content')).toContainText(
      '1105, Shivalik Abaise'
    );
});

test('TC-OM-22 : Verify Tooltip for Schedule Offer Call', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).hover();
    const tooltip = await page.locator('.ant-tooltip-inner');
    await expect(tooltip).toHaveText('Schedule offer call');
});

test.only('TC-OM-23 : Verify Office Location Handling for Virtual Call Type', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();
    await page.getByRole('img', { name: 'calendar' }).click();

    await expect(page.locator('span[title="Virtual"]')).toBeVisible();
    await page.locator('span[title="Virtual"]').click();

    await expect(page.getByText('Interview Address', { exact: true })).not.toBeVisible();
});
