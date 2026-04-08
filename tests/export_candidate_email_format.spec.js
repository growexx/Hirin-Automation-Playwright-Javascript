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

/** Same browser context as `page` so clipboard from Copy email format is available in Yopmail. */
async function openYopmailAndPasteEmailFormat(page) {
    const yopmailPage = await page.context().newPage();
    try {
        // Grant clipboard permissions to the context before navigating
        await yopmailPage.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
        
        await yopmailPage.goto('https://yopmail.com/', { waitUntil: 'domcontentloaded' });
        
        // Login and check inbox
        await yopmailPage.getByRole('textbox', { name: 'Login' }).fill('bikash.m@yopmail.com');
        await yopmailPage.getByTitle('Check Inbox @yopmail.com').click();
        
        // Wait for inbox frame to attach (following offer-management.spec.js pattern)
        await yopmailPage.locator('iframe[name="ifinbox"]').waitFor({ state: 'attached', timeout: 10_000 });
        await yopmailPage.waitForLoadState('domcontentloaded');
        
        // Click compose/new mail button with better reliability
        const composeBtn = yopmailPage.locator('#newmail');
        await composeBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await composeBtn.click();
        await yopmailPage.waitForTimeout(2000);
        
        // Wait for composer frame to attach
        await yopmailPage.locator('iframe[name="ifmail"]').waitFor({ state: 'attached', timeout: 10_000 });
        
        // Get clipboard text directly from yopmailPage context (same context, can access clipboard)
        // Try to read HTML format first (rich formatting), then fallback to plain text
        const clipText = await yopmailPage.evaluate(async () => {
            try {
                // Try to read HTML/rich format from clipboard
                const items = await navigator.clipboard.read();
                let htmlContent = '';
                let plainText = '';
                
                for (const item of items) {
                    // Check for HTML format
                    if (item.types.includes('text/html')) {
                        const htmlBlob = await item.getType('text/html');
                        htmlContent = await htmlBlob.text();
                        console.log('Found HTML format in clipboard');
                    }
                    // Check for plain text format
                    if (item.types.includes('text/plain')) {
                        const textBlob = await item.getType('text/plain');
                        plainText = await textBlob.text();
                        console.log('Found plain text format in clipboard');
                    }
                }
                
                // Prefer HTML if available, fallback to plain text
                return { html: htmlContent, text: plainText };
            } catch (err) {
                console.error('Clipboard read error (rich format):', err.message);
                // Fallback to simple readText()
                try {
                    const text = await navigator.clipboard.readText();
                    return { html: '', text: text };
                } catch (fallbackErr) {
                    console.error('Clipboard readText fallback failed:', fallbackErr.message);
                    return { html: '', text: '' };
                }
            }
        });
        
        console.log('Clipboard content - HTML length:', clipText.html.length, 'Text length:', clipText.text.length);
        
        // Use HTML if available, otherwise use plain text
        const contentToPaste = clipText.html || clipText.text;
        
        if (contentToPaste && contentToPaste.length > 0) {
            // Inject content directly into the contenteditable via JavaScript in the iframe
            // Use locator inside the frame to access the msgbody element
            const msgBodyLocator = yopmailPage.frameLocator('iframe[name="ifmail"]').locator('#msgbody');
            
            // Determine if we have HTML content
            const isHTML = contentToPaste.includes('<table') || contentToPaste.includes('<tr') || contentToPaste.includes('<td');
            
            // Fill the contenteditable element with the clipboard content
            try {
                // First, click to focus the element
                await msgBodyLocator.click();
                await yopmailPage.waitForTimeout(500);
                
                if (isHTML) {
                    // For HTML content, directly set innerHTML since we have the full HTML table
                    console.log('Setting HTML table content via innerHTML...');
                    
                    await msgBodyLocator.evaluate((element, content) => {
                        element.innerHTML = content;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }, contentToPaste);
                    console.log('HTML table successfully injected');
                    await yopmailPage.waitForTimeout(2000);
                } else {
                    // For plain text, set textContent as before
                    await msgBodyLocator.evaluate((element, text) => {
                        const formattedText = text
                            .replace(/\t/g, '    ')
                            .trim();
                        element.textContent = formattedText;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.focus();
                    }, contentToPaste);
                    console.log('Pasted as formatted plain text');
                    await yopmailPage.waitForTimeout(2000);
                }
                
                console.log('Content type:', isHTML ? 'HTML/Table' : 'Plain text');
                console.log('Content successfully pasted into msgbody');
                await yopmailPage.waitForTimeout(1000);
            } catch (injectionError) {
                console.error('Failed to paste content:', injectionError.message);
            }
        } else {
            console.warn('Clipboard is empty or unreadable');
        }
    } catch (error) {
        console.error('Yopmail paste error:', error.message);
    } finally {
        // Optional: Close the Yopmail tab
        // await yopmailPage.close().catch(() => {});
    }
        // Capture screenshot of Yopmail with pasted table
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await yopmailPage.screenshot({ path: `screenshots/yopmail-pasted-table-${timestamp}.png` });
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
});

test('TC-CE-02 : Verify Export button visible for Admin @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
});

test('TC-CE-03 : Verify Excel export functionality @smoke @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="export-candidates-button"]')).toBeVisible();
    await page.locator('[data-testid="export-candidates-button"]').click();
    await expect(page.locator('span:has-text("Export Candidates")')).toBeVisible();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.getByText('Download Excel', { exact: true }).click();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.locator(`span:has-text("Export Now")`).click();
    await page.waitForLoadState('networkidle');
    const download = await page.waitForEvent('download');
    await expect(page.getByText(/\d+ candidate(s)? exported successfully/)).toBeVisible({ timeout: 15000 });
    expect(download.suggestedFilename()).toBeTruthy();
    // Assert that download file is an Excel file
    const fileExtension = download.suggestedFilename().split('.').pop();
    expect(fileExtension).toBe('xlsx');
});

test('TC-CE-04 : Verify ZIP download functionality @smoke @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await expect(page.locator('span:has-text("Export Candidates")')).toBeVisible();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({ timeout: 8000 });
    const downloadBtn = page.locator('[data-testid="download-zip-btn"]');
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
    await expect(downloadBtn).toBeEnabled({ timeout: 5000 });
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;
    await expect(page.getByText(/Resumes downloaded successfully/)).toBeVisible({timeout: 60000});
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
    await loginAndNavigateToCandidatesPageAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('copy-email-table-modal').getByText('Copy for Email')).toBeVisible({timeout: 8000});
    await expect(page.locator('[data-testid="copy-email-btn"]')).toBeEnabled({timeout:10000});
    await page.locator('[data-testid="copy-email-btn"]').click();
    await expect(page.getByText(/Email format copied to clipboard/)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);
    await expect(page.getByText(/Email format copied to clipboard/)).toBeHidden({ timeout: 5000 });
});

test('TC-CE-10 : Verify candidate count display in modal @regression @export-candidate-email-format', async ({ page }) => {
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
    await page.locator('tbody.ant-table-tbody tr.ant-table-row').first().locator('td').nth(1).locator('span.normal-link').click();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.locator('.ant-tabs-tabpane-active').getByTestId('export-candidates-button')).toBeVisible({ timeout: 5000 });
});

test('TC-CE-17: Verify column customization interface displays correctly @smoke @regression @export-candidate-email-format', async ({ page }) => {
    const copyModal = page.getByTestId('copy-email-table-modal');
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(copyModal.getByText('Copy for Email')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="clear-all-btn"]')).toBeEnabled({ timeout: 5000 });
    await page.locator('[data-testid="clear-all-btn"]').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).toBeVisible({ timeout: 5000 });
    const columnCheckbox = (name) => copyModal.getByRole('checkbox', { name, exact: true });
    await columnCheckbox('Job Position').click();
    await columnCheckbox('Candidate Name').click();
    await columnCheckbox('Contact Number').click();
    await columnCheckbox('Email ID').click();
    await columnCheckbox('Current Company').click();
    await columnCheckbox('Total Experience').click();
    await columnCheckbox('Location').click();
    await columnCheckbox('CTC').click();
    await columnCheckbox('Expected CTC').click();
    await columnCheckbox('Notice Period').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).not.toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Job Position')).toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Candidate Name')).toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Contact Number')).toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Email ID')).toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Current Company')).toBeVisible({timeout: 5000});
    await expect(page.getByTitle('Total Experience')).toBeVisible({timeout: 5000});
});

test('TC-CE-18: Verify copy email format functionality @smoke @regression @export-candidate-email-format', async ({ page }) => {
    const copyModal = page.getByTestId('copy-email-table-modal');
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="export-candidates-button"]').click();
    await page.getByRole('radio', { name: 'mail Copy for Email (Table' }).click();
    await page.getByRole('button', { name: 'download Export Now' }).click();
    await page.waitForLoadState('networkidle');
    await expect(copyModal.getByText('Copy for Email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="clear-all-btn"]')).toBeEnabled({ timeout: 10000 });
    await page.locator('[data-testid="clear-all-btn"]').click();
    await expect(page.getByText('Please select at least one column', { exact: true })).toBeVisible({ timeout: 5000 });
    const columnCheckbox = (name) => copyModal.getByRole('checkbox', { name, exact: true });
    await columnCheckbox('Job Position').click();
    await columnCheckbox('Candidate Name').click();
    await columnCheckbox('Contact Number').click();
    await columnCheckbox('Email ID').click();
    await expect(page.locator('[data-testid="copy-email-btn"]')).toBeVisible({timeout: 5000});
    await page.locator('[data-testid="copy-email-btn"]').click();
    await expect(page.getByText(/Email format copied to clipboard/)).toBeVisible({ timeout: 5000 });
    await openYopmailAndPasteEmailFormat(page);
    
    // Capture screenshot of Yopmail with pasted table
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: `screenshots/hirin-table-${timestamp}.png` });
});

test('TC-CE-19: Verify job-level export does not include other job candidates @regression @export-candidate-email-format', async ({ page }) => {
    await loginAndNavigateToCandidatesPageAsRecruiter(page);
    await page.waitForLoadState('networkidle');
    await page.locator('tbody.ant-table-tbody tr.ant-table-row').first().locator('td').nth(1).locator('span.normal-link').click();
    await page.locator('#rc-tabs-0-tab-2').click();
    await expect(page.locator('.ant-tabs-tabpane-active').getByTestId('export-candidates-button')).toBeVisible({ timeout: 5000 });
    await page.locator('.ant-tabs-tabpane-active').getByTestId('export-candidates-button').click();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.getByText('Download Excel', { exact: true }).click();
    await expect(page.getByText('Download Excel', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.locator(`span:has-text("Export Now")`).click();
    await page.waitForLoadState('networkidle');
    const download = await page.waitForEvent('download');
    await expect(page.getByText(/\d+ candidate(s)? exported successfully/)).toBeVisible({ timeout: 15000 });
    expect(download.suggestedFilename()).toBeTruthy();
    // Assert that download file is an Excel file
    const fileExtension = download.suggestedFilename().split('.').pop();
    expect(fileExtension).toBe('xlsx');
});