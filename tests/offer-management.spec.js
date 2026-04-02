const fs = require('fs');
const pdfParse = require('pdf-parse');
const { test, expect } = require('@playwright/test');
const { asyncWrapProviders } = require('async_hooks');

const CLIENT_NAME = 'Growexx';
const JOB_TITLE = 'Mern Developer';
const RESUME = 'data/rajKashyap.pdf';
const RESUME1 = 'data/Shailendra Rathore.pdf';
const RESUME2 = 'data/Arjun_Ravani.pdf';
const OFFER_LETTER_1 = 'data/Offer Letter 1.pdf';
const OFFER_LETTER_2 = 'data/Offer Letter 2.pdf';
const INVALID_FILE_SIZE = 'data/20MB-TESTFILE.ORG.pdf';
const MAX_FILE_SIZE = 'data/9 mb file.pdf';
const FIRST_NAME = 'Raj';
const FIRST_NAME1 = 'Shailendra';
const FIRST_NAME2 = 'Arjun';
const EMAIL = 'rajkashyap@gmail.com';
const EMAIL1 = 'shailendra.cliqe@gmail.com';
const EMAIL2 = 'arjun.ravani@gmail.com';
const CANDIDATE_FULL_NAME = 'Raj Kashyap';
const CANDIDATE_FULL_NAME1 = 'Shailendra Rathore';
const CANDIDATE_FULL_NAME2 = 'Arjun Ravani';
const PHONE_NUMBER = '+91 9876543210';
const PHONE_NUMBER1 = '+91 9876543211';
const PHONE_NUMBER2 = '+91 9876543212';
const EMAIL_PREFIX = EMAIL.split('@')[0];
const EMAIL_PREFIX1 = EMAIL1.split('@')[0];

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

async function addCandidateToTheJob1(page, filePath, firstName) {
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
    await page.getByRole('textbox', { name: 'Name' }).fill(CANDIDATE_FULL_NAME1);
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL1);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER1);
    await page.click('body');

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE}`, 'i'))).toBeVisible();
}

async function addCandidateToTheJob2(page, filePath, firstName) {
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
    await page.getByRole('textbox', { name: 'Name' }).fill(CANDIDATE_FULL_NAME2);
    await page.locator('[data-testid="candidate-email"]').click();
    await page.getByRole('textbox', { name: 'email' }).fill(EMAIL2);
    await page.locator('[data-testid="candidate-phone"]').click();
    await page.getByRole('textbox', { placeholder: 'e.g. +1 1234567890' }).fill(PHONE_NUMBER2);
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

async function moveCandidateToDifferentStage1(page) {
    await expect(page.getByText('Stage: CV Screening Pending', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: CV Screening Pending').click();
    await page.getByText('Move to Recruiter Screening').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Recruiter Screening"');

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Candidate Response Awaiting')).toBeVisible();

    await expect(page.getByText('Stage: Candidate Response Awaiting', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: Candidate Response Awaiting').click();
    await page.getByText('Move to AI Interview').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();    
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "AI Interview"');

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: AI Interview Awaiting')).toBeVisible();

    await page.getByText('Stage: AI Interview Awaiting').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round"');

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round Review Pending').click();
    await page.getByText('Move to HM Round 2').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round 2"');

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round 2 Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round 2 Review Pending').click();
    await page.getByText('Move to Select Candidate', { exact: true }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Candidate is selected');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Select Candidate"', { timeout: 35000 });

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Document Submission Pending')).toBeVisible();
    await page.waitForTimeout(2000);
}

async function moveCandidateToDifferentStage2(page) {
    await expect(page.getByText('Stage: CV Screening Pending', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: CV Screening Pending').click();
    await page.getByText('Move to Recruiter Screening').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Recruiter Screening"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Candidate Response Awaiting')).toBeVisible();

    await expect(page.getByText('Stage: Candidate Response Awaiting', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: Candidate Response Awaiting').click();
    await page.getByText('Move to AI Interview').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();    
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "AI Interview"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: AI Interview Awaiting')).toBeVisible();

    await page.getByText('Stage: AI Interview Awaiting').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round Review Pending').click();
    await page.getByText('Move to HM Round 2').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round 2"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round 2 Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round 2 Review Pending').click();
    await page.getByText('Move to Select Candidate', { exact: true }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Candidate is selected');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Select Candidate"', { timeout: 35000 });

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Document Submission Pending', {timeout: 30000})).toBeVisible();

    await page.getByText('Stage: Document Submission Pending').click();
    await page.getByText('Move to Offer Call').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Call"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
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
      `The invite for the offer call has been successfully sent to ${CANDIDATE_FULL_NAME2}`
    );

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await page.getByText('Stage: Offer Call Scheduled').click();
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first()).toBeVisible();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Offer is released');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Release"');

    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
}

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

async function openYopmailAndCheckInbox1(browser) {
    const yopContext = await browser.newContext();
    const yopmailPage = await yopContext.newPage();
    try {
        await yopmailPage.goto('https://yopmail.com/', {
            waitUntil: 'commit',
            timeout: 60_000,
        });
        await yopmailPage.waitForLoadState('domcontentloaded', { timeout: 60_000 });
    } catch (err) {
        await yopContext.close().catch(() => {});
        throw err;
    }
    await yopmailPage.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX1}@yopmail.com`);
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

async function openYopmailAndClickOnOfferLetter(page) {
    const yopmailPage = await page.context().newPage();
    await yopmailPage.goto('https://yopmail.com/');
    await yopmailPage.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX}@yopmail.com`);
    await yopmailPage.getByTitle('Check Inbox @yopmail.com').click();
    await yopmailPage.locator('iframe[name="ifinbox"]').waitFor({ state: 'attached', timeout: 10000 });
    const inboxFrame = yopmailPage.locator('iframe[name="ifinbox"]').contentFrame();

    await expect(inboxFrame.getByRole('button', { name: /info@hirin\.ai Growexx: Offer Letter/ }).first()).toBeVisible({ timeout: 15000 });
    await inboxFrame.getByRole('button', { name: /info@hirin\.ai Growexx: Offer Letter/ }).first().click();
    await expect(
        yopmailPage.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')
    ).toContainText('Growexx: Offer Letter for Mern Developer');
    await yopmailPage.waitForTimeout(4000);

    const popupPromise = yopmailPage.waitForEvent('popup');
    await yopmailPage.frameLocator('#ifmail').getByRole('link', { name: 'Accept Offer' }).click();
    return await popupPromise;
}

async function openYopmailAndClickOnOfferLetter1(page) {
    const yopmailPage = await page.context().newPage();
    await yopmailPage.goto('https://yopmail.com/');
    await yopmailPage.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX1}@yopmail.com`);
    await yopmailPage.getByTitle('Check Inbox @yopmail.com').click();
    await yopmailPage.locator('iframe[name="ifinbox"]').waitFor({ state: 'attached', timeout: 10000 });
    const inboxFrame = yopmailPage.locator('iframe[name="ifinbox"]').contentFrame();

    await expect(inboxFrame.getByRole('button', { name: /info@hirin\.ai Growexx: Offer Letter/ }).first()).toBeVisible({ timeout: 15000 });
    await inboxFrame.getByRole('button', { name: /info@hirin\.ai Growexx: Offer Letter/ }).first().click();
    await expect(
        yopmailPage.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')
    ).toContainText('Growexx: Offer Letter for Mern Developer');
    await yopmailPage.waitForTimeout(4000);

    const popupPromise = yopmailPage.waitForEvent('popup');
    await yopmailPage.frameLocator('#ifmail').getByRole('link', { name: 'Accept Offer' }).click();
    return await popupPromise;
}

async function drawSignature(page, canvasLocator) {
    const box = await canvasLocator.boundingBox();
  
    const points = [
      [20, 40],
      [80, 70],
      [140, 30],
      [200, 80]
    ];
  
    await page.mouse.move(box.x + points[0][0], box.y + points[0][1]);
    await page.mouse.down();
  
    for (const [x, y] of points.slice(1)) {
      await page.mouse.move(box.x + x, box.y + y);
    }
  
    await page.mouse.up();
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

  function jobsTableCandidateName1(page) {
    const shortName = new RegExp(FIRST_NAME1, 'i');
    const fullName = new RegExp(
      CANDIDATE_FULL_NAME1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
  
    const table = page.locator('.ant-table').filter({ hasText: fullName });
  
    const inCell = table.locator('.ant-table-cell, td').filter({ hasText: fullName }).first();
    const asLinkButton = table.getByRole('button', { name: shortName }).first();
    const asAnchor = table.getByRole('link', { name: shortName }).first();
    const byTestId = table.locator('[data-testid="candidate-name"]').first();
  
    return inCell.or(asLinkButton).or(asAnchor).or(byTestId);
  }

  function jobsTableCandidateName2(page) {
    const shortName = new RegExp(FIRST_NAME2, 'i');
    const fullName = new RegExp(
      CANDIDATE_FULL_NAME2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
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

test('TC-OM-05 : Create a new job with Offer Release workflow @Stage', async ({ page }) => {
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

test('TC-OM-07 : Add a candidate to the job with Offer Release workflow @Stage', async ({ page }) => {
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

test('TC-OM-08 : Move a candidate to different stage in the job with Offer Release workflow @Stage', async ({ page, context }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
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

test('TC-OM-23 : Verify Office Location Handling for Virtual Call Type', async ({ page }) => {
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

test('TC-OM-24 : Verify Handling of Invalid Input for Date/Time', async ({ page }) => {
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
     // Get yesterday's date in YYYY-MM-DD format
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const formattedDate = yesterday.toISOString().split('T')[0];

  // Locate the date cell using title attribute
  const dateCell = page.locator(`td[title="${formattedDate}"]`);

  // Assert it has disabled class
  await expect(dateCell).toHaveClass(/ant-picker-cell-disabled/);
});

test('TC-OM-25 : Verify Meeting Link Handling for In-Person Call Type', async ({ page }) => {
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

    await expect(page.getByRole('img', { name: 'In-Person' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Microsoft Teams' })).not.toBeVisible();
});

// HIR - 4048 //
test('TC-OM-26 : Validate Offer Released stage appears in candidate pipeline', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await page.getByText('Stage: Offer Call Scheduled').click();
    await expect(
      page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first()
    ).toBeVisible();
});

test('TC-OM-27 : Validate recruiter can move candidate to Offer Released stage', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await page.getByText('Stage: Offer Call Scheduled').click();
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first()).toBeVisible();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Offer is released');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Release"');
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
});

test('TC-OM-28 : Validate Offer Release Pending card appears in Recruiter Awaiting Action section', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Release Pending', { exact: true }).first()).toBeVisible();
});

test('TC-OM-29 : Validate clicking Offer Release Pending card filters candidate list', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Release Pending', { exact: true }).first()).toBeVisible();
    await page.getByText('Offer Release Pending', { exact: true }).first().click();
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
});

test('TC-OM-30 : Validate Offer Acceptance Pending card appears in Candidates Awaiting Action section', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Acceptance Pending', { exact: true }).first()).toBeVisible();
});

test('TC-OM-31 : Validate Offer Released stage card appears in Candidate by Stages section', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Released', { exact: true }).first()).toBeVisible();
});

test('TC-OM-32 : Release the offer letter for the candidate',{timeout: 10000}, async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', OFFER_LETTER_1);
    await page.waitForTimeout(3000);
    await expect(page.locator(`span:has-text("Offer Letter 1.pdf")`)).toBeVisible();
    await expect(page.locator(`span:has-text("Release Offer")`)).toBeEnabled();
    await page.locator(`span:has-text("Release Offer")`).click();
    await expect(page.locator('body')).toContainText('Offer released successfully');
});

test('TC-OM-33 : Validate clicking Offer Released stage card filters candidate listing', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Dashboard', { exact: true }).first().click();
    await expect(page.getByText('Offer Released', { exact: true }).first()).toBeVisible();
    await page.getByText('Offer Released', { exact: true }).first().click();
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
});

test('TC-OM-34 : Validate stage filter dropdown shows Offer Released option',{timeout: 10000}, async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await page.getByText('Candidates', { exact: true }).first().click();
   // await page.getByRole('img', { name: 'close' }).click();
   await page.waitForTimeout(3000);
    await page.getByRole('img', { name: 'sort' }).click();
    await page.getByRole('menu').getByText('Current Stage', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Search...' }).click();
    await page.getByRole('textbox', { name: 'Search...' }).fill('Offer Released');
    await expect(page.locator('.ant-cascader-menu-item', {hasText: 'Offer Released'})).toBeVisible();
    await page.locator(`span:has-text("Stages")`).click();
    await page.getByRole('textbox', { name: 'Search...' }).click();
    await page.getByRole('textbox', { name: 'Search...' }).fill('Offer Released');
    await expect(page.locator('.ant-cascader-menu-item', {hasText: 'Offer Released'})).toBeVisible();
});

// HIR - 4047 //
test('TC-OM-35 : Verify navigation to Offer tab from Candidate Details', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await expect(page.getByText('Offer', { exact: true }).first()).toBeVisible();
});

test('TC-OM-36 : Verify Offer tab loads candidate offer information', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    const details = page.getByTestId('candidate-details');
    await expect(details.getByRole('heading', { name: 'Last Sent Offer Letters' })).toBeVisible();
    const sentByLine = details.getByText(/This document was sent by/);
    await expect(sentByLine).toBeVisible();
    await expect(sentByLine).toContainText('Super Admin');
});

test('TC-OM-37 : Verify Accepted status display with green indicator', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    const offerAcceptPopup = await openYopmailAndClickOnOfferLetter(page);
    const canvas1 = offerAcceptPopup.locator('canvas.signature-canvas').first();
    await drawSignature(offerAcceptPopup, canvas1);
    const canvas2 = offerAcceptPopup.locator('canvas.signature-canvas').nth(1);
    await canvas2.scrollIntoViewIfNeeded();
    await drawSignature(offerAcceptPopup, canvas2);
    await offerAcceptPopup.getByRole('button', { name: 'Accept offer' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(10000);
    await expect(offerAcceptPopup.getByRole('button', { name: 'Accept offer' })).toBeEnabled();
    await offerAcceptPopup.getByRole('button', { name: 'Accept offer' }).click();
    await expect(page.locator('body')).toContainText(`Congratulations, ${CANDIDATE_FULL_NAME}!`);
    await offerAcceptPopup.close();
    await page.bringToFront();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('svg[data-icon="check-circle"]')).toBeVisible({ timeout: 5000 });
});

test('TC-OM-38 : Verify acceptance date and time display', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const messageDiv = page
        .locator('//span[normalize-space()="Offer Accepted"]/following-sibling::div')
        .filter({ hasText: /has accepted the offer/i });

    await expect(messageDiv).toBeVisible();
    await expect(messageDiv).toContainText(`${CANDIDATE_FULL_NAME} has accepted the offer`);
    const offerAcceptedMessageText = await messageDiv.innerText();
    console.log("Offer Accepted Message Text: ", offerAcceptedMessageText);
});

test('TC-OM-39 : Verify signed document filename visibility', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    await expect(page.locator(`span:has-text("Download signed offer letter")`)).toBeVisible();
});

test('TC-OM-40 : Verify signed document download using icon', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const downloadSignedOfferLink = page.locator('span:has-text("Download signed offer letter")');
    await expect(downloadSignedOfferLink).toBeVisible();
    const expectedSignedOfferFilename = `Offer_Letter_Signed_${CANDIDATE_FULL_NAME.replace(/\s+/g, '_')}.pdf`;
    const downloadPromise = page.waitForEvent('download');
    await downloadSignedOfferLink.click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toBe(expectedSignedOfferFilename);
    console.log("Downloaded Signed Offer Filename: ", download.suggestedFilename());
});

test('TC-OM-41 : Verify Declined status display with red indicator', async ({ page, browser }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-4').click();
    await expect(page.getByText('Master Flow + Document Submission + Offer Release', { exact: true })).toBeVisible();
    await addCandidateToTheJob1(page, RESUME1, FIRST_NAME1);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(4000);
    await moveCandidateToDifferentStage1(page);
    await openYopmailAndCheckInbox1(browser);

    await expect(page.getByText('Stage: Document Submission Pending', {timeout: 30000})).toBeVisible();
    await page.getByText('Stage: Document Submission Pending').click();
    await page.getByText('Move to Offer Call').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Call"');

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Schedule Pending')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
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
      `The invite for the offer call has been successfully sent to ${CANDIDATE_FULL_NAME1}`
    );

    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();

    await page.getByText('Workflow Progress', { exact: true }).first().click();
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await expect(page.getByText('Stage: Offer Call Scheduled')).toBeVisible();
    await page.getByText('Stage: Offer Call Scheduled').click();
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first()).toBeVisible();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Move to Offer Release' }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Offer is released');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Offer Release"');
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', OFFER_LETTER_2);
    await page.waitForTimeout(3000);
    await expect(page.locator(`span:has-text("Offer Letter 2.pdf")`)).toBeVisible();
    await expect(page.locator(`span:has-text("Release Offer")`)).toBeEnabled();
    await page.locator(`span:has-text("Release Offer")`).click();
    await expect(page.locator('body')).toContainText('Offer released successfully');
    const offerAcceptPopup = await openYopmailAndClickOnOfferLetter1(page);
    await offerAcceptPopup.getByRole('button', { name: 'Decline offer' }).scrollIntoViewIfNeeded();
    await expect(offerAcceptPopup.getByRole('button', { name: 'Accept offer' })).toBeDisabled();
    await expect(offerAcceptPopup.getByRole('button', { name: 'Decline offer' })).toBeEnabled();
    await offerAcceptPopup.getByRole('button', { name: 'Decline offer' }).click();
    await offerAcceptPopup.locator(`span:has-text("Decline Offer")`).nth(1).click();
    await offerAcceptPopup.waitForTimeout(3000);
    await offerAcceptPopup.close();
    await page.bringToFront();
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('svg[data-icon="close-circle"]')).toBeVisible({ timeout: 5000 });
});

test('TC-OM-42 : Verify declined date and time display', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    const messageDiv = page
    .locator('//span[normalize-space()="Offer Declined"]/following-sibling::div')
    .filter({ hasText: /has declined the offer/i });
    await expect(messageDiv).toBeVisible();
    await expect(messageDiv).toContainText(`${CANDIDATE_FULL_NAME1} has declined the offer`);
    const offerDeclinedMessageText = await messageDiv.innerText();
    console.log("Offer Declined Message Text: ", offerDeclinedMessageText);
});

test('TC-OM-43 : Verify recruiter can view original offer details for declined offer', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    await expect(page.getByRole('img', { name: 'file-done' })).toBeVisible();
});

test('TC-OM-44 : Verify no signed document shown for declined candidate', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    await expect(page.locator(`span:has-text("Download signed offer letter")`)).not.toBeVisible();
});

// HIR - 3922 //

test('TC-OM-45 : Verify File Size Validation (>10MB)Verify File Size Validation (>10MB)',{timeout: 180000} async ({ page }) => {
    // await loginAndNavigateToCreateJob(page);
    // await clickOnTheJob(page);
    // await page.waitForTimeout(3000);
    // await page.locator('#rc-tabs-0-tab-2').click();
    // await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    // await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    // await jobsTableCandidateName2(page).click();
    // await page.waitForTimeout(3000);
    // await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    // await page.setInputFiles('input[type="file"]', INVALID_FILE_SIZE);
    // await expect(page.getByText(/File size exceeds max limit:/i)).toBeVisible();
    // await page.waitForTimeout(3000);
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await addCandidateToTheJob2(page, RESUME2, FIRST_NAME2);
    await page.reload();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(4000);
    await moveCandidateToDifferentStage2(page);
    await page.setInputFiles('input[type="file"]', INVALID_FILE_SIZE);
    await expect(page.getByText(/File size exceeds max limit:/i)).toBeVisible();
    await page.waitForTimeout(3000);
});

test('TC-OM-46 : Verify Remove Uploaded File', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', OFFER_LETTER_1);
    await expect(page.getByRole('img', { name: 'close' }).nth(2)).toBeVisible();
    await page.getByRole('img', { name: 'close' }).nth(2).click();
    await expect(page.getByRole('img', { name: 'close' }).nth(2)).not.toBeVisible();
});

test('TC-OM-47 : Verify Release Offer Button Disabled Without Upload', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await expect(page.locator(`span:has-text("Release Offer")`)).toBeDisabled();
});

test('TC-OM-48 : Verify Release Offer Button Enabled After Upload', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Release Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', OFFER_LETTER_1);
    await expect(page.locator(`span:has-text("Release Offer")`)).toBeEnabled();
});

test('TC-OM-49 : Verify Resend Button Visibility', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', OFFER_LETTER_1);
    await expect(page.locator(`span:has-text("Release Offer")`)).toBeEnabled();
    await page.locator(`span:has-text("Release Offer")`).click();
    await expect(page.locator('body')).toContainText('Offer released successfully');
    await expect(page.locator(`span:has-text("Resend Offer")`)).toBeVisible();
});

test('TC-OM-50 : Upload Area Instruction Clarity', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await expect(page.locator(`span.ant-upload > div.ant-upload-drag-container > div`).nth(1)).toContainText('Click to upload or drag and drop');
    await expect(page.locator(`span.ant-upload > div.ant-upload-drag-container > div`).nth(2)).toContainText('PDF (Max 10MB per file)');
    await expect(page.locator(`span.ant-upload > div.ant-upload-drag-container > div`).nth(3)).toContainText('Select multiple files at once (Max 5 files)');
});

test('TC-OM-51 : Upload Progress Indicator Visibility', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await page.setInputFiles('input[type="file"]', MAX_FILE_SIZE);
    await expect(page.locator('.ant-spin.ant-spin-sm.ant-spin-spinning')).toBeVisible();
});

test('TC-OM-52 : Workflow Progress Updates on Offer Upload', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Released' })).toBeVisible();
});

test('TC-OM-53 : Workflow Progress Updates on Offer Sent', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName2(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName2(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Acceptance Pending')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Acceptance Pending' })    ).toBeVisible();
});

// HIR - 3923 //
test('TC-OM-54 : Verify signed PDF generated', async ({ page }, testInfo) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const expectedSignedOfferFilename = `Offer_Letter_Signed_${CANDIDATE_FULL_NAME.replace(/\s+/g, '_')}.pdf`;
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('img', { name: 'Download signed offer letter' }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toBe(expectedSignedOfferFilename);
    const downloadPath = testInfo.outputPath(download.suggestedFilename() || expectedSignedOfferFilename);
    await download.saveAs(downloadPath);
    const pdfBuffer = fs.readFileSync(downloadPath);
    const { text } = await pdfParse(pdfBuffer);
    expect(text).toContain('Digitally Signed & Accepted on');
});

test('TC-OM-55 : Verify link reuse after acceptance', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const page1 = await openYopmailAndClickOnOfferLetter(page);
    await page1.waitForLoadState('networkidle');
    await expect(page1.getByRole('heading', { name: 'Offer Already Accepted' })).toBeVisible();
});

test('TC-OM-56 : Verify link reuse after decline', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    const page1 = await openYopmailAndClickOnOfferLetter1(page);
    await page1.waitForLoadState('networkidle');
    await expect(page1.getByRole('heading', { name: 'Offer Already Declined' })).toBeVisible();
});

test('TC-OM-57 : Verify candidate workflow when accepting offer', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Accepted' })).toBeVisible();
});

test('TC-OM-58 : Verify candidate workflow when declining offer', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Declined' })).toBeVisible();
});


test('TC-OM-59 : Verify candidate can download signed offer letter after acceptance', async ({ page }, testInfo) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const page1 = await openYopmailAndClickOnOfferLetter(page);
    await page1.waitForLoadState('networkidle');
    await expect(page1.getByRole('heading', { name: 'Offer Already Accepted' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('img', { name: 'Download signed offer letter' }).click();
    const expectedSignedOfferFilename = `Offer_Letter_Signed_${CANDIDATE_FULL_NAME.replace(/\s+/g, '_')}.pdf`;
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toBe(expectedSignedOfferFilename);
    const downloadPath = testInfo.outputPath(download.suggestedFilename() || expectedSignedOfferFilename);
    await download.saveAs(downloadPath);
    const pdfBuffer = fs.readFileSync(downloadPath);
    const { text } = await pdfParse(pdfBuffer);
    expect(text).toContain('Digitally Signed & Accepted on');
});

test('TC-OM-60 : Verify workflow when candidate opens accepted link again', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    const page1 = await openYopmailAndClickOnOfferLetter(page);
    await page1.waitForLoadState('networkidle');
    await expect(page1.getByRole('heading', { name: 'Offer Already Accepted' })).toBeVisible();
    await page.bringToFront();
    await expect(page.getByText('Stage: Offer Accepted')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Accepted' })).toBeVisible();
});

test('TC-OM-61 : Verify workflow when candidate opens declined link again', async ({ page }) => {
    await loginAndNavigateToCreateJob(page);
    await clickOnTheJob(page);
    await page.waitForTimeout(3000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.getByRole('button', { name: 'Add candidates' })).toBeVisible({ timeout: 20000 });
    await expect(jobsTableCandidateName1(page)).toBeVisible({ timeout: 20000 });
    await jobsTableCandidateName1(page).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    const page1 = await openYopmailAndClickOnOfferLetter1(page);
    await page1.waitForLoadState('networkidle');
    await expect(page1.getByRole('heading', { name: 'Offer Already Declined' })).toBeVisible();
    await page.bringToFront();
    await expect(page.getByText('Stage: Offer Declined')).toBeVisible();
    await page.getByRole('tab', { name: 'Workflow Progress' }).click();
    await expect(page.getByRole('heading', { name: 'Offer Declined' })).toBeVisible();
});
