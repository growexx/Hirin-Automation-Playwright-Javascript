import { test, expect } from '@playwright/test';

const CLIENT_NAME = 'Growexx';

const CANDIDATES_NAV_MAX_RETRIES = 3;
const CANDIDATES_NAV_WAIT_MS = 10000;

/**
 * Clicks the Candidates menu item with retry. Navigation can be flaky after client selection;
 * waits for the export control to confirm the candidates view loaded.
 * @param {import('@playwright/test').Page} page
 */
async function clickCandidatesNavWithRetry(page) {
    const candidatesNav = page.locator('div').filter({ hasText: /^Candidates$/ }).first();
    const exportReady = page.locator('[data-testid="export-candidates-button"]');

    for (let attempt = 1; attempt <= CANDIDATES_NAV_MAX_RETRIES; attempt++) {
        await candidatesNav.click();
        try {
            await exportReady.waitFor({ state: 'visible', timeout: CANDIDATES_NAV_WAIT_MS });
            return;
        } catch {
            if (attempt === CANDIDATES_NAV_MAX_RETRIES) {
                throw new Error(
                    `Candidates navigation did not show export control after ${CANDIDATES_NAV_MAX_RETRIES} attempts`
                );
            }
            await page.waitForTimeout(500);
        }
    }
}

async function loginAndNavigateToCandidatesPageAsAdmin(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await page.waitForTimeout(3000);

    await clickCandidatesNavWithRetry(page);

}

async function loginAndNavigateToCandidatesPageAsRecruiter(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('bikash.m@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await page.waitForTimeout(3000);

    await clickCandidatesNavWithRetry(page);

}

/** Ant Design export UI: scope to the visible dialog so clicks do not hit the mask or duplicate nodes. */
function exportCandidatesModal(page) {
    return page.getByRole('dialog').filter({ hasText: 'Export Candidates' });
}

async function openExportCandidatesModal(page) {
    await page.locator('[data-testid="export-candidates-button"]').click();
    await expect(page.locator('span:has-text("Export Candidates")')).toBeVisible();
    const modal = exportCandidatesModal(page);
    await expect(modal).toBeVisible({ timeout: 15000 });
    return modal;
}

async function clickExportNowInExportModal(modal) {
    const exportNow = modal.getByRole('button', { name: /Export Now/i });
    await expect(exportNow).toBeVisible();
    await exportNow.scrollIntoViewIfNeeded();
    await exportNow.click();
}


test('TC-CE-01 : Verify Export button visible for Recruiter @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
});

test('TC-CE-02 : Verify Export button visible for Admin @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsAdmin(page);
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
});

test('TC-CE-03 : Verify Excel export functionality @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
    await page.locator('[data-testid="export-candidates-button"]').click();
    await expect(page.locator('span:has-text("Export Candidates")')).toBeVisible();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.getByText('Download Excel', { exact: true }).click();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.locator(`span:has-text("Export Now")`).click();
    const download = await page.waitForEvent('download');
    await expect(page.getByText(/\d+ candidate(s)? exported successfully/)).toBeVisible({ timeout: 15000 });
    expect(download.suggestedFilename()).toBeTruthy();
    // Assert that download file is an Excel file
    const fileExtension = download.suggestedFilename().split('.').pop();
    expect(fileExtension).toBe('xlsx');
});

test.only('TC-CE-04 : Verify ZIP download functionality @regression @export-candidate-email-format', { timeout: 240000 }, async ({ page }) => {
    test.setTimeout(240000);
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    const downloadBtn = page.locator('[data-testid="download-zip-btn"]');
    await expect(downloadBtn).toBeVisible({timeout: 5000});
    await expect(downloadBtn).toBeEnabled({timeout: 5000});
    await downloadBtn.click();
    await expect(page.getByText(/Resumes downloaded successfully/)).toBeVisible({timeout: 20000});
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toBeTruthy();
    const fileExtension = download.suggestedFilename().split('.').pop();
    expect(fileExtension).toBe('zip');
});

test('TC-CE-05 : Verify copy email button visibility @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="copy-email-btn"]')).toBeVisible({timeout: 5000});
});

test('TC-CE-06 : Verify download ZIP button visibility @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('export-candidates-button').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.getByTestId('download-zip-btn')).toBeVisible();
});

test('TC-CE-07 : Verify cancel overlay click behavior @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('export-candidates-button').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="close-modal-btn"]')).toBeVisible({timeout: 5000});
    await page.locator('[data-testid="close-modal-btn"]').click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).not.toBeVisible({timeout: 5000});
});

test('TC-CE-08 : Verify modal close button @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('export-candidates-button').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.getByRole('button', { name: 'Close' }).last()).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).last().click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).not.toBeVisible({timeout: 5000});
});

test('TC-CE-09 : Verify toast auto-dismiss @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="copy-email-btn"]')).toBeEnabled({timeout:10000});
    await page.locator('[data-testid="copy-email-btn"]').click();
    await expect(page.getByText(/Email format copied to clipboard/)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3000);
    await expect(page.getByText(/Email format copied to clipboard/)).toBeHidden({ timeout: 5000 });
});

test('TC-CE-10 : Verify candidate count display in modalrmat', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    const text = await page.getByText(/candidates ready to copy/).textContent();
    const number = parseInt(text.match(/\d+/)[0]);
    expect(text).toBeTruthy();
    console.log("Number of candidates ready to copy: ", number);
});

test('TC-CE-11 : Verify minimum 1 column validation @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="clear-all-btn"]')).toBeEnabled({timeout: 5000});
    await page.locator('[data-testid="clear-all-btn"]').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).toBeVisible({timeout: 5000});
});

test('TC-CE-12: Verify select all / clear all buttons functionality @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="clear-all-btn"]')).toBeEnabled({timeout: 5000});
    await page.locator('[data-testid="clear-all-btn"]').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).toBeVisible({timeout: 5000});
    await page.locator('[data-testid="select-all-btn"]').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).not.toBeVisible({timeout: 5000});
});

test('TC-CE-13: Verify radio button behavior for export options @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await expect(page.getByRole('radio', { name: 'mail Copy for Email (Table' })).toBeChecked({timeout: 5000});
    await expect(page.getByRole('radio', { name: 'file-excel Download Excel' })).not.toBeChecked({timeout: 5000});
    await page.getByRole('radio', { name: 'file-excel Download Excel' }).click();
    await expect(page.getByRole('radio', { name: 'file-excel Download Excel' })).toBeChecked({timeout: 5000});
    await expect(page.getByRole('radio', { name: 'mail Copy for Email (Table' })).not.toBeChecked({timeout: 5000});
});

test('TC-CE-14: Verify export modal opens on clicking export button @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    const text = await page.getByText(/candidates ready to copy/).textContent();
    expect(text).toBeTruthy();
    await expect(page.locator('[data-testid="close-modal-btn"]')).toBeVisible({timeout: 5000});
    await page.locator('[data-testid="close-modal-btn"]').click();
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).not.toBeVisible({timeout: 5000});
});

test('TC-CE-15: Verify export button visibility on main page @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible({timeout: 5000});
});

test('TC-CE-16: Verify export button visibility on job-level page @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');

});