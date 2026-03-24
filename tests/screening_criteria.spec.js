import {test,expect} from '@playwright/test';

const CLIENT_NAME = 'Growexx';
const SETTINGS_CLICK_MAX_RETRIES = 3;
const SETTINGS_NAV_WAIT_MS = 5000;

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

async function loginAndNavigateToScreeningCriteria(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    await clickSettingsWithRetry(page);
    await page.locator('div').filter({ hasText: /^Screening Criteria/ }).first().click();
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByLabel('Screening Criteria').first()).toContainText('Screening Criteria');
}

/** Use this to open the Add Criteria modal (avoids matching the modal's "Add Criteria" submit button). */
function getOpenAddCriteriaButton(page) {
    return page.getByRole('button', { name: /\+?\s*Add Criteria/i }).first();
}

test('TC-SC-01 - Screening Criteria @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
});

test('TC-SC-02 - Page title and subtitle display @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await expect(page.getByRole('heading', { name: 'Screening Criteria' })).toBeVisible();
    await expect(page.locator('.sub-heading')).toBeVisible();
});

test('TC-SC-03 - "+ Add Criteria" button is visible @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    const addCriteriaBtn = getOpenAddCriteriaButton(page);
    await expect(addCriteriaBtn).toBeVisible();
    const isTopRight = await addCriteriaBtn.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        return rect.right > viewportWidth * 0.5;
    });
    expect(isTopRight, 'Add Criteria button should be in the top-right area of the page').toBe(true);
});

test('TC-SC-04 - All saved criteria cards display with name and description @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCards = page.locator('[class*="criteria-list-item"]');
    await expect(criteriaCards.first()).toBeVisible({ timeout: 10000 });
    const count = await criteriaCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < Math.min(count, 5); i++) {
        const card = criteriaCards.nth(i);
        await expect(card).toBeVisible();
        const text = (await card.textContent())?.trim() ?? '';
        expect(text.length, 'Each criteria card should display name and description').toBeGreaterThan(0);
    }
});

test('TC-SC-05 - Each criteria card shows name (bold) and description @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCards = page.locator('[class*="criteria-list-item"]');
    await expect(criteriaCards.first()).toBeVisible({ timeout: 10000 });
    const count = await criteriaCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < Math.min(count, 5); i++) {
        const card = criteriaCards.nth(i);
        await expect(card).toBeVisible();
        const { hasBoldName, hasDescriptionBelow, nameLighterThanDescription } = await card.evaluate((el) => {
            const boldEl = el.querySelector('b, strong') ||
                Array.from(el.querySelectorAll('*')).find((n) => {
                    const w = window.getComputedStyle(n).fontWeight;
                    return parseInt(w, 10) >= 600 || w === 'bold';
                });
            const hasBoldName = !!boldEl && (boldEl.textContent || '').trim().length > 0;
            const fullText = (el.textContent || '').trim();
            const nameText = boldEl ? (boldEl.textContent || '').trim() : '';
            const hasDescriptionBelow = fullText.length > nameText.length;
            let nameLighterThanDescription = true;
            if (boldEl) {
                const descCandidates = Array.from(el.querySelectorAll('p, span, div')).filter(
                    (n) => n !== boldEl && !boldEl.contains(n) && (n.textContent || '').trim().length > 0
                );
                const boldWeight = parseInt(window.getComputedStyle(boldEl).fontWeight, 10) || 700;
                nameLighterThanDescription = descCandidates.length === 0 || descCandidates.some(
                    (n) => (parseInt(window.getComputedStyle(n).fontWeight, 10) || 400) < boldWeight
                );
            }
            return { hasBoldName, hasDescriptionBelow, nameLighterThanDescription };
        });
        expect(hasBoldName, `Criteria card ${i + 1}: name should appear bold`).toBe(true);
        expect(hasDescriptionBelow, `Criteria card ${i + 1}: description text should appear below name`).toBe(true);
        expect(nameLighterThanDescription, `Criteria card ${i + 1}: description should be lighter than name`).toBe(true);
    }
});

test('TC-SC-06 - Pagination counter displays correctly @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.locator('[class*="criteria-list-item"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toBeVisible({ timeout: 5000 });
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const match = paginationText.match(/Showing (\d+) to (\d+) of (\d+) results/);
    expect(match).toBeTruthy();
    const [, start, end, total] = match.map(Number);
    expect(start).toBe(1);
    expect(end).toBeLessThanOrEqual(total);
    expect(total).toBeGreaterThanOrEqual(1);
    if (total >= 11) {
        expect(end).toBe(10);
        expect(paginationText).toContain('Showing 1 to 10 of');
    }
});

test('TC-SC-07 - Next button navigates to next page @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 });
    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 criteria; no next page available');
    await nextBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toContainText(/Showing 11 to \d+ of \d+ results/);
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const [, end, total] = (paginationText.match(/Showing \d+ to (\d+) of (\d+) results/) || []).map(Number);
    if (end === total) {
        const nextBtnAfter = page.getByRole('button', { name: 'Next' });
        await expect(nextBtnAfter).toBeDisabled();
    }
});

test('TC-SC-08 - Previous button navigates back @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 });
    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 criteria; cannot be on page 2');
    await nextBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toContainText(/Showing 11 to \d+ of \d+ results/);
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await prevBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toContainText(/Showing 1 to 10 of \d+ results/);
});

test('TC-SC-09 - Previous is disabled on first page @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 });
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await expect(prevBtn).toBeDisabled();
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    expect(paginationText).toMatch(/Showing 1 to \d+ of \d+ results/);
});

test('TC-SC-10 - Next is disabled on last page @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 });
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const totalResults = Number(paginationText.match(/of (\d+) results/)?.[1] ?? 0);
    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(!isNextDisabled && totalResults <= 10, 'Fewer than 11 criteria; only one page');
    if (totalResults <= 10) return;
    const pageSize = 10;
    const lastPage = Math.ceil(totalResults / pageSize);
    for (let p = 1; p < lastPage; p++) {
        await nextBtn.click();
        await page.waitForTimeout(500);
    }
    const nextBtnOnLast = page.getByRole('button', { name: 'Next' });
    await expect(nextBtnOnLast).toBeDisabled();
});

test('TC-SC-11 - Pagination counter updates after adding new criteria @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 });
    const paginationTextBefore = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const totalBefore = Number(paginationTextBefore.match(/of (\d+) results/)?.[1] ?? 0);

    await getOpenAddCriteriaButton(page).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    const nameInput = page.getByRole('dialog').getByLabel(/name|title|criteria name/i).or(
        page.getByRole('dialog').getByPlaceholder(/name|title|criteria/i)
    );
    const descInput = page.getByRole('dialog').getByLabel(/description/i).or(
        page.getByRole('dialog').getByPlaceholder(/description/i)
    );
    const nameCount = await nameInput.count();
    test.skip(nameCount === 0, 'Add criteria form structure not found');
    await nameInput.first().fill(`Pagination test ${Date.now()}`);
    if (await descInput.count() > 0) {
        await descInput.first().fill('Criteria added for pagination counter test');
    }
    await page.getByRole('dialog').getByRole('button', { name: /Save|Add|Create|Submit/i }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    await page.waitForTimeout(2000);
    const paginationTextAfter = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const totalAfter = Number(paginationTextAfter.match(/of (\d+) results/)?.[1] ?? 0);
    expect(totalAfter).toBe(totalBefore + 1);
});

test('TC-SC-12 - Clicking "+ Add Criteria" opens the modal @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText(/Add New Screening Criteria|Add.*Screening Criteria/i);
    await expect(dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/Criteria Name|Name|criteria/i))).toBeVisible();
    await expect(dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Description/i))).toBeVisible();
});

test('TC-SC-13 - Modal title is correct @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.ant-modal-title').or(dialog.getByRole('heading'))).toHaveText(/Add New Screening Criteria/i);
});

test('TC-SC-14 - Modal fields are empty on first open @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/Criteria Name|Name|criteria/i)).first();
    const descField = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Description/i)).first();
    await expect(nameField).toHaveValue('');
    await expect(descField).toHaveValue('');
});

test('TC-SC-15 - Background is dimmed when modal is open @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const mask = page.locator('.ant-modal-mask, .ant-modal-wrap [class*="mask"]');
    await expect(mask.first()).toBeVisible();
});

test('TC-SC-16 - Close modal via X button @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCountBefore = await page.locator('[class*="criteria-list-item"]').count();
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Close' }).or(dialog.locator('.ant-modal-close')).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(500);
    const criteriaCountAfter = await page.locator('[class*="criteria-list-item"]').count();
    expect(criteriaCountAfter).toBe(criteriaCountBefore);
});

test('TC-SC-17 - Close modal via Cancel button @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCountBefore = await page.locator('[class*="criteria-list-item"]').count();
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(500);
    const criteriaCountAfter = await page.locator('[class*="criteria-list-item"]').count();
    expect(criteriaCountAfter).toBe(criteriaCountBefore);
});

test('TC-SC-18 - Fields are cleared after cancel and reopening @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/Criteria Name|Name|criteria/i)).first();
    const descField = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Description/i)).first();
    await nameField.fill('Test criteria name');
    await descField.fill('Test criteria description');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(500);
    await getOpenAddCriteriaButton(page).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameFieldReopen = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/Criteria Name|Name|criteria/i)).first();
    const descFieldReopen = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Description/i)).first();
    await expect(nameFieldReopen).toHaveValue('');
    await expect(descFieldReopen).toHaveValue('');
});

//Run from here
test('TC-SC-19 - Submit with both fields empty shows validation @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await expect(dialog.getByText('Criteria name is required.')).toBeVisible({ timeout: 3000 });
});

test('TC-SC-20 - Submit with Criteria Name empty shows validation @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCountBefore = await page.locator('[class*="criteria-list-item"]').count();
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const descField = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Provide clear instructions/i)).first();
    await descField.fill('Some description');
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await expect(dialog.getByText('Criteria name is required.')).toBeVisible({ timeout: 3000 });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    const criteriaCountAfter = await page.locator('[class*="criteria-list-item"]').count();
    expect(criteriaCountAfter).toBe(criteriaCountBefore);
});

test('TC-SC-21 - Submit with Description empty shows validation @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(3000);
    const criteriaCountBefore = await page.locator('[class*="criteria-list-item"]').count();
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/e\.g\., Location/i)).first();
    await nameField.fill('Test criteria');
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await expect(dialog.getByText(/Description.*required|description is required/i)).toBeVisible({ timeout: 3000 });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    const criteriaCountAfter = await page.locator('[class*="criteria-list-item"]').count();
    expect(criteriaCountAfter).toBe(criteriaCountBefore);
});

test('TC-SC-22 - Criteria Name field is marked as required @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameLabel = dialog.locator('label').filter({ hasText: /Criteria Name|Name/i }).first();
    await expect(nameLabel).toContainText('*');
});

test('TC-SC-23 - Description field is marked as required @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const descLabel = dialog.locator('label').filter({ hasText: /Description/i }).first();
    await expect(descLabel).toContainText('*');
});

test('TC-SC-24 - Criteria Name field shows placeholder @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameInput = dialog.getByPlaceholder(/e\.g\., Location, Budget, Salary Range/i);
    await expect(nameInput.first()).toBeVisible();
    await expect(nameInput.first()).toHaveAttribute('placeholder', /e\.g\., Location, Budget, Salary Range/i);
});

test('TC-SC-25 - Description field shows placeholder @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const descInput = dialog.getByPlaceholder(/Provide clear instructions to candidates/i);
    await expect(descInput.first()).toBeVisible();
    await expect(descInput.first()).toHaveAttribute('placeholder', /Provide clear instructions to candidates/i);
});

async function addCriteriaViaModal(page, name, description) {
    const dialog = page.getByRole('dialog');
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/e\.g\., Location|Criteria/i)).first();
    const descField = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Provide clear instructions/i)).first();
    await nameField.fill(name);
    await descField.fill(description);
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
}

test('TC-SC-26 - Submit with duplicate Criteria Name @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.waitForTimeout(1000);
    await getOpenAddCriteriaButton(page).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    await addCriteriaViaModal(page, 'Budget', 'Budget constraint description');
    await expect(page.getByText('A criteria with this name already exists. Please use a unique name.')).toBeVisible({ timeout: 8000 });
});


test('TC-SC-27 - Criteria Name accepts special characters @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await addCriteriaViaModal(page, 'Salary & Budget!', 'Description for special chars');
    await page.waitForTimeout(2000);
    const errorVisible = await page.getByText(/can only contain letters, numbers, spaces, hyphens|invalid|not allowed|special character|restriction/i).isVisible().catch(() => false);
    const dialogClosed = await dialog.isHidden().catch(() => false);
    expect(dialogClosed || errorVisible).toBe(true);
});

test('TC-SC-28 - Criteria Name with only whitespace @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/e\.g\., Location|Criteria/i)).first();
    await nameField.fill('   ');
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await expect(dialog.getByText('Criteria name is required.')).toBeVisible({ timeout: 3000 });
});

test('TC-SC-29 - Description field is resizable @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const descField = dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Provide clear instructions/i)).first();
    await expect(descField).toBeVisible();
    const isResizable = await descField.evaluate((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'textarea') return true;
        const style = window.getComputedStyle(el);
        return style.resize !== 'none' || el.querySelector('[class*="resize"]') !== null;
    });
    expect(isResizable, 'Description field should be resizable (textarea or has resize handle)').toBe(true);
});

test('TC-SC-30 - Very long Criteria Name input @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const longName = 'A'.repeat(500);
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/e\.g\., Location|Criteria/i)).first();
    await nameField.fill(longName);
    await dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Provide clear instructions/i)).first().fill('Description');
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await page.waitForTimeout(2000);
    const maxLengthError = await page.getByText(/exceed|max.*length|too long|maximum|cannot exceed.*character/i).isVisible().catch(() => false);
    const dialogClosed = await dialog.isHidden().catch(() => false);
    expect(dialogClosed || maxLengthError).toBe(true);
});

test('TC-SC-31 - Very long Description input @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await getOpenAddCriteriaButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    const longDesc = 'B'.repeat(2000);
    const nameField = dialog.getByLabel(/Criteria Name|Name/i).or(dialog.getByPlaceholder(/e\.g\., Location|Criteria/i)).first();
    await nameField.fill(`Long desc test ${Date.now()}`);
    await dialog.getByLabel(/Description/i).or(dialog.getByPlaceholder(/Provide clear instructions/i)).first().fill(longDesc);
    await dialog.getByRole('button', { name: /Add Criteria|Save|Submit/i }).click();
    await page.waitForTimeout(2000);
    const maxLengthError = await page.getByText(/exceed|max.*length|too long|maximum|cannot exceed.*character/i).isVisible().catch(() => false);
    const dialogClosed = await dialog.isHidden().catch(() => false);
    expect(dialogClosed || maxLengthError).toBe(true);
});

test('TC-SC-32 - Successfully add a new criteria @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    await page.getByText(/Showing \d+ to \d+ of \d+ results/).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const paginationTextBefore = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent().catch(() => '');
    const totalBefore = paginationTextBefore ? Number(paginationTextBefore.match(/of (\d+) results/)?.[1] ?? 0) : await page.locator('[class*="criteria-list-item"]').count();

    const criteriaName = `Test criteria ${Date.now()}`;
    const criteriaDesc = 'Valid description for new criteria';
    await getOpenAddCriteriaButton(page).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    await addCriteriaViaModal(page, criteriaName, criteriaDesc);
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1500);

    const paginationTextAfter = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent().catch(() => '');
    const totalAfter = paginationTextAfter ? Number(paginationTextAfter.match(/of (\d+) results/)?.[1] ?? 0) : await page.locator('[class*="criteria-list-item"]').count();
    expect(totalAfter).toBe(totalBefore + 1);
    await expect(page.locator('[class*="criteria-list-item"]').filter({ hasText: criteriaName })).toBeVisible({ timeout: 5000 });
});

test('TC-SC-33 - Newly added criteria is visible in the list @smoke @regression @screeningCriteria', async ({ page }) => {
    await loginAndNavigateToScreeningCriteria(page);
    const criteriaName = `List visibility ${Date.now()}`;
    const criteriaDesc = 'Description for list visibility test';
    await getOpenAddCriteriaButton(page).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    await addCriteriaViaModal(page, criteriaName, criteriaDesc);
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1500);

    const card = page.locator('[class*="criteria-list-item"]').filter({ hasText: criteriaName });
    await expect(card).toBeVisible({ timeout: 5000 });
    await expect(card).toContainText(criteriaName);
    await expect(card).toContainText(criteriaDesc);
});
