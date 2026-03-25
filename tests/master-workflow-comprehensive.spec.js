import {test,expect} from '@playwright/test';

const JOB_TITLE1 = 'Project Manager 2';
const CLIENT_NAME = 'Growexx';
const FILE_PATH1 = 'data/Shailendra Rathore.pdf';
const EMAIL = 'shailendra.cliqe@gmail.com';
const FIRST_NAME1 = FILE_PATH1.split('/').pop().split(' ')[0];
const EMAIL_PREFIX = EMAIL.split('@')[0];

/**
 * Stage labels in the candidate drawer — use string or regexp for getByText.
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} pattern
 */
function stageTextLocator(page, pattern) {
    return page.getByText(pattern);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} pattern
 * @param {number} [timeoutMs]
 */
async function expectStageVisible(page, pattern, timeoutMs = 60000) {
    await expect(stageTextLocator(page, pattern).first()).toBeVisible({ timeout: timeoutMs });
}

async function goToJob(page) {
    await page.waitForTimeout(5000);
//    await expect(page.locator('div').filter({hasText: /^Jobs$/})).toBeVisible();
//    await page.locator('div').filter({ hasText: /^Jobs$/}).click();
    await expect(page.getByText('Jobs', { exact: true })).toBeVisible();
    await page.getByText('Jobs', { exact: true }).click();
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
    await page.getByRole('heading', {name: `${JOB_TITLE1}`}).first().click();
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

   // await page.locator('div').filter({hasText: /^Jobs$/}).click();
    await page.getByText('Jobs', { exact: true }).click();

}

async function removeIframe(page) {
    await page.evaluate(() => {
        document.querySelector('#fc_frame')?.remove();
    });
}

test('Create job with Master Workflow and add a candidate @regression @masterWorkflow', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('button', {name: 'plus Create Job'}).click();
    await page.getByRole('textbox', {name: /Write Job Title Here/i}).fill(JOB_TITLE1);
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
    await page.getByText('Master Workflow', {exact: true}).click();

    // Trigger Whatsapp Template: click first "SDE1" (span next to label), select Project Manager, then Select
    await page.getByText('SDE1', {exact: true}).first().click();
    await page.getByRole('radio', {name: /Project Manager/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();

    // Trigger AI Call: click value next to label, select Project Manager, then Select
//    await page.getByText('SDE1', {exact: true}).click();
//    await page.getByRole('radio', {name: /Project Manager/i}).click();
//    await page.getByRole('button', {name: 'Select'}).click();

    // Trigger Technical Assessment: select Concept Ninja, then Technical Assessment, then Select
    await page.locator('div:has-text("Trigger Technical Assessment")').getByText('Select', {exact: true}).first().click();
    await page.getByText('Concept Ninja', {exact: true}).click();
    await page.getByRole('radio', {name: /Technical Assessment/i}).click();
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

    await expect(page.getByText(`"${JOB_TITLE1}" position has been successfully added.`)).toBeVisible();

    await page.waitForTimeout(4000);


    await uploadCandidate(page, FILE_PATH1, FIRST_NAME1);

    await page.getByTestId('next-button').click();
    await expect(page.getByRole('link', {name: new RegExp('Shailendr', 'i')})).toBeVisible();

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE1}`, 'i'))).toBeVisible();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME1})).toBeVisible();

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();

    await page.waitForTimeout(3000);

    await expect(page.getByText('Stage: CV Screening Pending')).toBeVisible();

    await page.waitForTimeout(15000);
    await page.reload({waitUntil: 'networkidle'});

    await expectStageVisible(
        page,
        /Stage:\s*Candidate Response Awaiting|Candidate Response Awaiting/i
    );

});

test('Create job with Master Workflow and update status manually @smoke @regression @masterWorkflow', async ({page}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await page.getByRole('button', {name: 'plus Create Job'}).click();
    await page.getByRole('textbox', {name: /Write Job Title Here/i}).fill(JOB_TITLE1);
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
    await page.getByText('Master Workflow', {exact: true}).click();

    // Trigger Whatsapp Template: click first "SDE1" (span next to label), select Project Manager, then Select
    await page.getByText('SDE1', {exact: true}).first().click();
    await page.getByRole('radio', {name: /Project Manager/i}).click();
    await page.getByRole('button', {name: 'Select'}).click();

    // Trigger AI Call: click value next to label, select Project Manager, then Select
//    await page.getByText('SDE1', {exact: true}).click();
//    await page.getByRole('radio', {name: /Project Manager/i}).click();
//    await page.getByRole('button', {name: 'Select'}).click();

    // Trigger Technical Assessment: select Concept Ninja, then Technical Assessment, then Select
    await page.locator('div:has-text("Trigger Technical Assessment")').getByText('Select', {exact: true}).first().click();
    await page.getByText('Concept Ninja', {exact: true}).click();
    await page.getByRole('radio', {name: /Technical Assessment/i}).click();
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

    await expect(page.getByText(`"${JOB_TITLE1}" position has been successfully added.`)).toBeVisible();

    await page.waitForTimeout(4000);


    await uploadCandidate(page, FILE_PATH1, FIRST_NAME1);

    await page.getByTestId('next-button').click();
    await expect(page.getByRole('link', {name: new RegExp('Shailendr', 'i')})).toBeVisible();

    await page.getByRole('button', {name: 'Done'}).click();

    await expect(page.getByText(new RegExp(`candidate.*successfully added.*${JOB_TITLE1}`, 'i'))).toBeVisible();

    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME1})).toBeVisible();

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();

    await page.waitForTimeout(3000);

    await expect(page.getByText('Stage: CV Screening Pending')).toBeVisible();

    await page.waitForTimeout(5000);
    await page.reload({waitUntil: 'networkidle'});

    await page.getByText('Stage: CV Screening Pending').first().click();
    await page.getByText('Move to Recruiter Screening').first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to Next Round');
    await page.getByTestId('submit-btn').click();

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);

    await expectStageVisible(
        page,
        /Stage:\s*Candidate Response Awaiting|Candidate Response Awaiting/i
    );
    await page.getByText('Stage: Candidate Response').first().click();
    await page.getByText('Move to Technical Assessment').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to Next Round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Technical Assessment"');

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Technical Assessment Awaiting')).toBeVisible();

    await page.getByText('Stage: Technical Assessment').click();
    await page.getByText('Move to AI Interview').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "AI Interview"');

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: AI Interview Awaiting')).toBeVisible();

    await page.getByText('Stage: AI Interview Awaiting').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round"');

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round Review Pending').click();
    await page.getByText('Move to HM Round').click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Moving to next round');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "HM Round 2"');

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: HM Round 2 Review Pending')).toBeVisible();

    await page.getByText('Stage: HM Round 2 Review Pending').click();
    await page.getByText('Select Candidate', { exact: true }).first().click();
    await page.getByTestId('note-input').click();
    await page.getByTestId('note-input').fill('Candidate is selected');
    await page.getByTestId('submit-btn').click();
    await expect(page.locator('body')).toContainText('Candidate has been successfully moved to "Select Candidate"');

    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Candidate Selected')).toBeVisible();

});

test('Check all email for Selected Candidate for Master Workflow @regression @masterWorkflow', async ({page,context}) => {
    test.setTimeout(150000);
    await loginAndNavigateToCreateJob(page);
    await page.waitForTimeout(3000);
    await page.getByRole('heading', { name: `${JOB_TITLE1}` }).first().click();
    await page.waitForTimeout(2000);
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.locator('span.candidate-name', {hasText: FIRST_NAME1})).toBeVisible();
    await page.locator('span.candidate-name', {hasText: FIRST_NAME1}).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Stage: Candidate Selected')).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.getByText(EMAIL)).toBeVisible();

    const page1 = await context.newPage();
    await page1.goto('https://yopmail.com/');
    await page1.getByRole('textbox', { name: 'Login' }).click();
    await page1.getByRole('textbox', { name: 'Login' }).fill(`${EMAIL_PREFIX}@yopmail.com`);
    await page1.getByTitle('Check Inbox @yopmail.com').click();
    await expect(page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Thank You for Applying - Growexx/ }).first()).toBeVisible();
    await page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Thank You for Applying - Growexx/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Thank You for Applying - Growexx has received your application');

    await page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Complete Your Screening/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Complete Your Screening to Proceed – Growexx | Project Manager');

    await page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Growexx - Your Technical/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Growexx - Your Technical Assessment for the Project Manager');

    await page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Growexx - Next Step: AI/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Growexx - Next Step: AI Interview for the Project Manager Role');

    await page1.locator('iframe[name="ifinbox"]').contentFrame().getByRole('button', { name: /info@hirin\.ai Growexx - Congratulations/ }).first().click();
    await expect(page1.locator('iframe[name="ifmail"]').contentFrame().getByRole('banner')).toContainText('Growexx - Congratulations - You\'re Selected for the Project Manager Role');
    });
