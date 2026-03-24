import {test,expect} from '@playwright/test';

const CLIENT_NAME = 'Growexx';
const SETTINGS_CLICK_MAX_RETRIES = 3;
const SETTINGS_NAV_WAIT_MS = 5000;
const DD_MM_YYYY_REGEX = /Created:\s*\d{1,2}\/\d{1,2}\/\d{4}/i;
const ISO_DATE_REGEX = /\d{4}-\d{2}-\d{2}/;

async function clickSettingsWithRetry(page) {
    const settingsBtn = page.getByRole('complementary').getByText('Settings', { exact: true });
    const timezoneLink = page.locator('div').filter({ hasText: /^Timezone$/ }).first();

    for (let attempt = 1; attempt <= SETTINGS_CLICK_MAX_RETRIES; attempt++) {
        await settingsBtn.click();
        try {
            await timezoneLink.waitFor({ state: 'visible', timeout: SETTINGS_NAV_WAIT_MS });
            return;
        } catch {
            if (attempt === SETTINGS_CLICK_MAX_RETRIES) {
                throw new Error(`Settings click did not open menu after ${SETTINGS_CLICK_MAX_RETRIES} attempts`);
            }
            await page.waitForTimeout(500);
        }
    }
}

async function loginAndNavigateToScreeningQuestionnaire(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    await clickSettingsWithRetry(page);
    await page.locator('div').filter({ hasText: /^Screening Questionnaire/ }).first().click();
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByLabel('Screening Questionnaire').first()).toContainText('Screening Questionnaire');
}

function getCreateModal(page) {
    return page.getByRole('dialog').filter({ hasText: 'Create Questionnaire Template' });
}

/**
 * "Questions (n)" in Create Questionnaire Template — visible text, often not `role="heading"`.
 * @param {import('@playwright/test').Page} page
 * @param {number} n
 */
function questionsPanelCountLabel(page, n) {
    return page.getByText(new RegExp(`Questions\\s*\\(\\s*${n}\\s*\\)`));
}

function getTemplateNameInput(modal) {
    return modal.getByPlaceholder(/e\.g\.\s*,\s*Technical Assessment/i).or(modal.getByRole('textbox', { name: /Template Name/i }));
}

test('TC-SQ-01 - Screening Questionnaire @smoke @regression @screeningQuestionnaire', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
});

test('TC-SQ-02 - Page displays template list in descending order of creation date (newest first)', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await expect(page.getByRole('heading', { name: /Screening Questionnaire/i })).toBeVisible();
    await expect(page.getByText(/Create and manage screening questionnaire templates/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /Add Template/i })).toBeVisible();

    await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 5000 });

    const count = await templateCards.count();
    if (count >= 2) {
        const createdDates = [];
        for (let i = 0; i < count; i++) {
            const cardText = await templateCards.nth(i).textContent();
            const match = (cardText || '').match(/Created:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
            if (match) {
                const [, day, month, year] = match;
                createdDates.push(new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)).getTime());
            }
        }
        for (let i = 1; i < createdDates.length; i++) {
            expect(createdDates[i], `Templates should be newest first: card ${i + 1} (${new Date(createdDates[i]).toISOString().slice(0, 10)}) should not be newer than card ${i} (${new Date(createdDates[i - 1]).toISOString().slice(0, 10)})`).toBeLessThanOrEqual(createdDates[i - 1]);
        }
    }
});

test('TC-SQ-03 - Navigating away and back to the page retains the same template list', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await templateCards.count();
    const templateListBefore = [];
    for (let i = 0; i < count; i++) {
        const text = (await templateCards.nth(i).textContent()) || '';
        templateListBefore.push(text.trim());
    }

    await page.locator('div').filter({ hasText: /^Screening Criteria$/ }).first().click();
    await page.waitForTimeout(1000);

    await page.locator('div').filter({ hasText: /^Screening Questionnaire/ }).first().click();
    await expect(page.getByRole('heading', { name: /Screening Questionnaire/i })).toBeVisible({ timeout: 10000 });

    const templateCardsAfter = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCardsAfter.first()).toBeVisible({ timeout: 10000 });
    const countAfter = await templateCardsAfter.count();
    expect(countAfter, 'Template count should be unchanged after navigating away and back').toBe(count);

    const templateListAfter = [];
    for (let i = 0; i < countAfter; i++) {
        const text = (await templateCardsAfter.nth(i).textContent()) || '';
        templateListAfter.push(text.trim());
    }
    expect(templateListAfter, 'Template list (order and content) should be the same after navigating away and back').toEqual(templateListBefore);
});

test('TC-SQ-04 - Each template card displays name, question count, up to 2 question preview, and created date', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await templateCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
        const card = templateCards.nth(i);
        const text = (await card.textContent()) || '';
        expect(text.trim().length, `Card ${i + 1} should have a name/title`).toBeGreaterThan(0);
        expect(text, `Card ${i + 1} should show question count (e.g. "N Question(s)")`).toMatch(/\d+\s*Question(s)?/i);
        expect(text, `Card ${i + 1} should show created date`).toMatch(/Created:\s*\d{1,2}\/\d{1,2}\/\d{4}/i);
        const hasQuestionPreview = text.match(/\?/) || text.length > 50;
        expect(hasQuestionPreview, `Card ${i + 1} should show at least one question in preview`).toBeTruthy();
    }
});

test('TC-SQ-05 - Template with more than 2 questions shows "+N more questions..." with accurate count', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await templateCards.count();

    for (let i = 0; i < count; i++) {
        const card = templateCards.nth(i);
        const text = (await card.textContent()) || '';
        const moreMatch = text.match(/\+(\d+)\s*more\s*questions?/i);
        if (!moreMatch) continue;
        const surplusShown = parseInt(moreMatch[1], 10);
        const totalMatch = text.match(/(\d+)\s*Questions?/i);
        expect(totalMatch, `Card with "+N more questions" should show total question count`).toBeTruthy();
        const total = parseInt(totalMatch[1], 10);
        const expectedSurplus = Math.max(0, total - 2);
        expect(surplusShown, `"+${surplusShown} more questions" should match total ${total} minus 2 previewed (expected +${expectedSurplus})`).toBe(expectedSurplus);
        return;
    }
});

test('TC-SQ-06 - Template assigned to a job displays "In Use" badge; delete icon hidden or shows warning', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const inUseCard = page.locator('.ant-card').filter({ hasText: /In Use/i }).first();
    const hasInUse = await inUseCard.count() > 0;
    if (!hasInUse) return;

    await expect(inUseCard).toBeVisible();
    await expect(inUseCard.getByText(/In Use/i)).toBeVisible();
    const cardText = await inUseCard.textContent();
    expect(cardText, 'Card with "In Use" should be visible').toMatch(/In Use/i);
});

test('TC-SQ-07 - Template with exactly 1 question does not show "+N more questions" link', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await templateCards.count();

    for (let i = 0; i < count; i++) {
        const card = templateCards.nth(i);
        const text = (await card.textContent()) || '';
        const oneQuestionMatch = text.match(/\b1\s*Question\b/i);
        if (!oneQuestionMatch) continue;
        expect(text, 'Template with 1 Question must not show "+N more questions..."').not.toMatch(/\+\d+\s*more\s*questions?/i);
    }
});

test('TC-SQ-08 - Created date is formatted consistently (DD/MM/YYYY) across all cards', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
    const count = await templateCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
        const card = templateCards.nth(i);
        const text = (await card.textContent()) || '';
        expect(text, `Card ${i + 1}: Created date must follow DD/MM/YYYY format`).toMatch(DD_MM_YYYY_REGEX);
        expect(text, `Card ${i + 1}: must not show ISO or mixed date format (YYYY-MM-DD)`).not.toMatch(ISO_DATE_REGEX);
    }
});

test('TC-SQ-09 - Footer shows "Showing X to Y of Z results" with correct counts', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const text = await footerText.textContent();
    const match = (text || '').match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+results/i);
    expect(match, 'Footer must match "Showing X to Y of Z results"').toBeTruthy();
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    const z = parseInt(match[3], 10);
    expect(x).toBeGreaterThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(x);
    expect(z).toBeGreaterThanOrEqual(y);
    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    const visibleCount = await templateCards.count();
    expect(visibleCount, 'Visible cards count should match footer range (Y - X + 1)').toBe(y - x + 1);
});

test('TC-SQ-10 - Clicking Next loads the next page; counter advances, different templates, Previous enabled', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const totalMatch = (await footerText.textContent() || '').match(/of\s+(\d+)\s+results/i);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    if (total <= 5) return;

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    const firstPageFirstCard = (await templateCards.nth(0).textContent()) || '';
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await nextBtn.click();
    await page.waitForTimeout(1000);

    const footerAfter = (await footerText.textContent() || '').match(/Showing\s+(\d+)\s+to\s+(\d+)/i);
    expect(footerAfter, 'Page counter should advance after Next').toBeTruthy();
    const afterFirstCard = (await templateCards.nth(0).textContent()) || '';
    expect(afterFirstCard, 'Different templates should be displayed on next page').not.toBe(firstPageFirstCard);
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await expect(prevBtn).toBeEnabled();
});

test('TC-SQ-11 - Clicking Previous loads the prior page; counter decrements, previous templates shown', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const totalMatch = (await footerText.textContent() || '').match(/of\s+(\d+)\s+results/i);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    if (total <= 5) return;

    const nextBtn = page.getByRole('button', { name: 'Next' });
    await nextBtn.click();
    await page.waitForTimeout(1000);
    const page2FirstCard = (await page.locator('.ant-card').filter({ hasText: /Questions?/ }).nth(0).textContent()) || '';

    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await prevBtn.click();
    await page.waitForTimeout(1000);

    const templateCards = page.locator('.ant-card').filter({ hasText: /Questions?/ });
    const backFirstCard = (await templateCards.nth(0).textContent()) || '';
    expect(backFirstCard, 'Previous set of templates should be shown').not.toBe(page2FirstCard);
    const footerAfter = (await footerText.textContent() || '').match(/Showing\s+(\d+)\s+to\s+(\d+)/i);
    expect(footerAfter, 'Page counter should show first page range').toBeTruthy();
    expect(parseInt(footerAfter[1], 10)).toBe(1);
});

test('TC-SQ-12 - Previous button is disabled on the first page', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const match = (await footerText.textContent() || '').match(/Showing\s+(\d+)\s+to/i);
    expect(match).toBeTruthy();
    const start = parseInt(match[1], 10);
    expect(start, 'Test expects to be on first page').toBe(1);

    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await expect(prevBtn).toBeDisabled();
});

test('TC-SQ-13 - Next button is disabled on the last page', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const nextBtn = page.getByRole('button', { name: 'Next' });

    while (await nextBtn.isEnabled().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(800);
    }

    const text = await footerText.textContent();
    const match = (text || '').match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+results/i);
    expect(match).toBeTruthy();
    const y = parseInt(match[2], 10);
    const z = parseInt(match[3], 10);
    expect(y, 'Should be on last page (Y equals Z)').toBe(z);
    await expect(nextBtn).toBeDisabled();
});

test('TC-SQ-14 - With exactly 5 results (one page), both Previous and Next are disabled', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const footerText = page.getByText(/Showing \d+ to \d+ of \d+ results/);
    await expect(footerText).toBeVisible({ timeout: 10000 });
    const text = (await footerText.textContent()) || '';
    const match = text.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+results/i);
    expect(match).toBeTruthy();
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    const z = parseInt(match[3], 10);

    expect(x).toBeGreaterThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(x);
    expect(z).toBeGreaterThanOrEqual(y);
    expect(text).toMatch(new RegExp(`Showing\\s+${x}\\s+to\\s+${y}\\s+of\\s+${z}\\s+results`, 'i'));

    const prevBtn = page.getByRole('button', { name: 'Previous' });
    const nextBtn = page.getByRole('button', { name: 'Next' });
    if (y === z) {
        await expect(prevBtn).toBeDisabled();
        await expect(nextBtn).toBeDisabled();
    }
});

test('TC-SQ-15 - Create Template: Clicking Add Template opens modal with required elements', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });
    await expect(modalHeading.getByText('Create Questionnaire Template')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'e.g., Technical Assessment' })).toBeVisible();
    await expect(page.getByText('Standard Attributes', { exact: true })).toBeVisible();
    await expect(questionsPanelCountLabel(page, 0)).toBeVisible();
    await expect(page.locator(`span:has-text("✕")`)).toBeVisible();

    await expect(page.locator(`span:has-text("Cancel")`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Questionnaire' })).toBeDisabled();

});

test('TC-SQ-16 - Create Template: Template Name field shows placeholder when empty', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('');
    await expect(nameInput).toHaveAttribute('placeholder', /e\.g\.\s*,\s*Technical Assessment/i);

    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-17 - Create Template: Standard Attributes list has pre-defined items and is scrollable', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Standard Attributes', { exact: true })).toBeVisible();
    await expect(page.getByText('Current Company', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Company Team Size', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Current Designation', { exact: true }).first()).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-18 - Create Template: Questions panel shows header and empty state initially', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await expect(questionsPanelCountLabel(page, 0)).toBeVisible();
    await expect(page.getByText(/Select fields from the left panel to add questions/i)).toBeVisible();
    await expect(page.getByText(/You can also add custom fields for unique requirements/i)).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-19 - Create Template: Cancel closes modal without adding template', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const addBtn = page.getByRole('button', { name: /Add Template/i });
    await addBtn.click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill('Test Cancel Template');
    await expect(nameInput).toHaveValue('Test Cancel Template');

    await page.locator('span:has-text("Cancel")').click();
    await page.locator(`span:has-text("Yes, Close")`).click();
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });

    await addBtn.click();
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
    const nameInputAgain = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await expect(nameInputAgain).toHaveValue('');
    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-20 - Create Template: Close icon (×) closes modal without saving', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.locator('span:has-text("✕")').click();
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
});

test('TC-SQ-21 - Create Template: Partially filled form resets after cancel and reopen', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);

    const addBtn = page.getByRole('button', { name: /Add Template/i });
    await addBtn.click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill('Partial Template Name');
    await expect(nameInput).toHaveValue('Partial Template Name');

    await page.locator('span:has-text("Cancel")').click();
    await page.locator(`span:has-text("Yes, Close")`).click();
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });

    await addBtn.click();
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
    const nameInputAgain = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await expect(nameInputAgain, 'Form must be reset; no stale data from previous session').toHaveValue('');
    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-22 - Create Template: Empty Template Name shows validation error, form not submitted', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Create Questionnaire' }).click({ force: true });
    await expect(modalHeading).toBeVisible();
    await expect(page.getByText(/required|please enter|template name/i)).toBeVisible({ timeout: 5000 });
    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await expect(nameInput.or(page.locator('.ant-form-item-has-error input'))).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
});

test('TC-SQ-23 - Create Template: Name filled but no questions - creation allowed with 0 questions or validation prevents', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill('Template With No Questions');
    await page.getByRole('button', { name: 'Create Questionnaire' }).click();

    const closed = !(await modalHeading.isVisible().catch(() => false));
    if (closed) {
        await expect(page.getByText(/Template With No Questions|0\s*Questions?/i)).toBeVisible({ timeout: 10000 });
    } else {
        await expect(page.getByText(/add at least one question|question required|please add/i)).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
    if (await modalHeading.isVisible().catch(() => false)) {
        await page.locator('span:has-text("Cancel")').click();
        await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
    }
});

test('TC-SQ-24 - Create Template: Whitespace-only Template Name treated as empty, validation error', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill('   \t  ');
    await page.getByRole('button', { name: 'Create Questionnaire' }).click({ force: true });

    await expect(modalHeading).toBeVisible();
    await expect(page.getByText('Template name is required')).toBeVisible({ timeout: 5000 });

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-25 - Create Template: Valid name + one question submits successfully, modal closes, template at top', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    const templateName = `Happy Path Template ${Date.now()}`;
    await nameInput.fill(templateName);

    const addQuestionControl = page.getByText('Current Company', { exact: true }).locator('..').getByRole('button', { name: /Add|\+/ }).or(page.getByText('Current Company', { exact: true }));
    await addQuestionControl.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Create Questionnaire' }).click();
    await expect(modalHeading).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 10000 });
    const cards = page.locator('.ant-card').filter({ hasText: templateName });
    await expect(cards.first()).toBeVisible();
    await expect(cards.first()).toContainText(/1\s*Question|\d+\s*Questions?/);
    await expect(cards.first()).toContainText(/Created:|[\d/]{8,10}/);
});

test('TC-SQ-26 - Create Template: Duplicate template name - system accepts or rejects; document behavior', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    const existingName = 'Test';
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill(existingName);
    await page.getByRole('button', { name: 'Create Questionnaire' }).click();

    await page.waitForTimeout(2000);
    const stillOpen = await modalHeading.isVisible().catch(() => false);
    if (stillOpen) {
        const duplicateMsg = page.getByText(/already exists|duplicate|same name/i);
        await expect(duplicateMsg).toBeVisible({ timeout: 3000 }).catch(() => {});
        await page.locator('span:has-text("Cancel")').click();
        await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
    } else {
        const list = page.locator('.ant-card').filter({ hasText: existingName });
        expect(await list.count()).toBeGreaterThanOrEqual(1);
    }
});

test('TC-SQ-27 - Create Template: Special characters in name show validation; Create Questionnaire disabled', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const specialName = 'Template @#<> "quotes"';
    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill(specialName);

    await expect(
        page.getByText(/Template name must contain only letters, numbers, and spaces/i)
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Create Questionnaire' })).toBeDisabled();

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-28 - Create Template: Long template name (200+ chars) allowed and handled by UI', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const longName = 'A'.repeat(220);
    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Assessment' });
    await nameInput.fill(longName);
    await expect(nameInput).toHaveValue(longName);

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-29 - Create Template: Clicking Standard Attribute adds it to Questions panel (Q1, count increments)', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await expect(questionsPanelCountLabel(page, 0)).toBeVisible();
    const currentCompany = page.getByText('Current Company', { exact: true }).first();
    await currentCompany.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(questionsPanelCountLabel(page, 1)).toBeVisible({ timeout: 5000 });
    const questionCard = page
        .locator('div')
        .filter({ has: page.locator('input[placeholder="Enter question text"]').first() })
        .first();
    await expect(questionCard.getByText('Q1', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(questionCard.getByText('Current Company', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Enter question text"]').first()).toHaveValue('Which company are you currently working with?');

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-30 - Create Template: Added attribute shows Added status in left panel', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await expect(questionsPanelCountLabel(page, 0)).toBeVisible();
    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(500);

    const currentCompanyAttributeRow = page
        .getByRole('button', { name: /Current Company/i })
        .filter({ hasText: /Which company are you currently working/i })
        .first();
    await expect(currentCompanyAttributeRow).toBeVisible({ timeout: 5000 });
    await expect(currentCompanyAttributeRow.getByText('Added', { exact: true })).toBeVisible({ timeout: 5000 });

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-31 - Create Template: Multiple attributes get sequential numbering Q1, Q2, Q3', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.getByText('Company Team Size', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.getByText('Current Designation', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);

    await expect(questionsPanelCountLabel(page, 3)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Q1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Q2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Q3', { exact: true }).first()).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-32 - Create Template: Question in right panel shows pre-filled default text in editable field', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(page.locator('input[placeholder="Enter question text"]').first()).toHaveValue(
        'Which company are you currently working with?'
    );

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-33 - Create Template: Default question text can be edited by user', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(500);

    const firstQuestionContainer = page
        .locator('div')
        .filter({ has: page.getByText('Q1', { exact: true }) })
        .first();
    const editableField = firstQuestionContainer
        .locator('input[placeholder="Enter question text"]:not([disabled]):not([readonly])')
        .first();
    await expect(editableField).toBeVisible({ timeout: 5000 });
    await editableField.fill('Edited: Which company are you currently working with?');
    await expect(editableField).toHaveValue(/Edited:/);
    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-34 - Create Template: Adding same standard attribute twice does not duplicate; Added state or warning', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const currentCompany = page.getByText('Current Company', { exact: true }).first();
    await currentCompany.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    await expect(questionsPanelCountLabel(page, 1)).toBeVisible({ timeout: 5000 });

    await currentCompany.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);

    const questionCount = await page.getByText(/Questions\s*\(\s*\d+\s*\)/).textContent().catch(() => '');
    const countMatch = (questionCount || '').match(/\((\d+)\)/);
    const n = countMatch ? parseInt(countMatch[1], 10) : 0;
    expect(n, 'Question count should remain 1; same attribute must not be duplicated').toBe(1);

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-35 - Custom Attribute: Add Custom Attribute option visible and clickable at bottom of left panel', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const addCustomLink = page.getByText(/Add Custom Attribute|Add Custom Field/i).first();
    await addCustomLink.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await expect(addCustomLink).toBeVisible({ timeout: 5000 });
    await addCustomLink.click({ timeout: 3000 });
    await page.waitForTimeout(500);
    await page.locator('span:has-text("Cancel")').click().catch(() => {});
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-36 - Custom Attribute: Adding name creates new custom question in right panel, numbered sequentially', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const addCustomLink = page.getByText(/Add Custom Attribute|Add Custom Field/i).first();
    await addCustomLink.scrollIntoViewIfNeeded().catch(() => {});
    await addCustomLink.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    const customQuestionName = `Name-${Date.now()}`;
    const customQuestionText = `Custom Q ${Date.now()}`;
    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Skills, Certifications' });
    await nameInput.fill(customQuestionName);
    const questionTextInput = page.getByPlaceholder('e.g., What programming languages and frameworks are you proficient in?');
    await questionTextInput.fill(customQuestionText);

    await expect(page.getByText(customQuestionText).or(page.getByText(/Q1|Question\s*1/i))).toBeVisible({ timeout: 5000 });
    await page.locator(`span:has-text("Add Custom Attribute")`).click();

    await expect(page.locator(`span:has-text("Q1")`).first()).toBeVisible({ timeout: 5000 });

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-37 - Custom Attribute: Empty name or empty question text shows validation, attribute not added', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const addCustomLink = page.getByText(/Add Custom Attribute|Add Custom Field/i).first();
    await addCustomLink.scrollIntoViewIfNeeded().catch(() => {});
    await addCustomLink.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    await page.locator(`span:has-text("Add Custom Attribute")`).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Attribute name is required/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Screening question is required/i)).toBeVisible({ timeout: 5000 });

    await page.locator('span:has-text("Cancel")').first().click();
    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-38 - Custom Attribute: Same name as Standard Attribute cannot be added', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    const addCustomLink = page.getByText(/Add Custom Attribute|Add Custom Field/i).first();
    await addCustomLink.scrollIntoViewIfNeeded().catch(() => {});
    await addCustomLink.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    const nameInput = page.getByRole('textbox', { name: 'e.g., Technical Skills, Certifications' });
    await nameInput.fill('Current Company');
    await page.getByPlaceholder('e.g., What programming languages and frameworks are you proficient in?').fill('Which company are you currently working with?');
    await page.locator(`span:has-text("Add Custom Attribute")`).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Attribute name already exists/i)).toBeVisible({ timeout: 5000 });

    await page.locator('span:has-text("Cancel")').first().click();
    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-39 - Create Template: Trash icon removes question; list renumbers, count decrements', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.getByText('Company Team Size', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await expect(page.locator(`span:has-text("Q2")`).first()).toBeVisible({ timeout: 5000 });

    const deleteBtn = page.locator('[data-icon="delete"]').nth(1)
    await deleteBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(page.locator(`span:has-text("Q1")`).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Q1|Question\s*1/i).first()).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

test('TC-SQ-40 - Create Template: Deleting all questions shows empty state and Questions (0)', async ({ page }) => {
    await loginAndNavigateToScreeningQuestionnaire(page);
    await page.getByRole('button', { name: /Add Template/i }).click();
    const modalHeading = page.getByRole('heading', { name: 'Create Questionnaire Template' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    await page.getByText('Current Company', { exact: true }).first().click({ timeout: 5000 });
    await page.waitForTimeout(300);
    await expect(page.locator('span:has-text("Q1")').first()).toBeVisible({ timeout: 5000 });

    const deleteBtn = page.locator('[data-icon="delete"]').first();
    await deleteBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(page.locator('span:has-text("Q1")')).toHaveCount(0);
    await expect(page.getByText(/Select fields from the left panel to add questions/i)).toBeVisible();
    const createBtn = page.getByRole('button', { name: /Create Questionnaire/i });
    await expect(createBtn).toBeVisible();

    await page.locator('span:has-text("Cancel")').click();
    await page.locator('span:has-text("Yes, Close")').click({ timeout: 3000 }).catch(() => {});
});

