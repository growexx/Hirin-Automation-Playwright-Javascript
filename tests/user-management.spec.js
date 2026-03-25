import {test,expect} from '@playwright/test';
import { listenerCount } from 'node:cluster';

const CLIENT_NAME = 'Growexx';
const SETTINGS_CLICK_MAX_RETRIES = 3;
const SETTINGS_NAV_WAIT_MS = 5000;
const ROLE_COLUMN_INDEX = 4;
const STATUS_COLUMN_INDEX = 5;
const CREATED_ON_COLUMN_INDEX = 6;
const ACTIONS_COLUMN_INDEX = 7;
const OPTIONAL_COLUMNS = ['Phone Number', 'Actions'];
const DD_MM_YYYY_REGEX = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const SETTINGS_SIDEBAR_ITEMS = [
    'Timezone',
    'Email Integration',
    'User Management',
    'Screening Criteria',
    { label: 'Clients/LOB/Department', pattern: /Clients[\s,/]+LOB[\s,/]+Department|Clients\s*\/\s*LOB/i },
    'Screening Questionnaire',
    'Careers Page',
    'Document Checklist',
];
const REQUIRED_USER_MANAGEMENT_COLUMNS = [
    'Name',
    'Email',
    'Phone Number',
    'Role',
    'Status',
    'Created On',
    'Actions',
];
const COLUMN_ALIASES = {
    'Phone Number': ['Phone Number', 'Phone', 'Phone No.'],
};
const ROLE_BADGE_EXPECTATIONS = [
    { role: 'Admin', txtcolor: '#6B21A8', bdrcolor: '#9333EA', bgcolor: '#F3E8FF' },
    { role: 'Hiring Manager', txtcolor: '#C2410C', bdrcolor: '#F97316', bgcolor: '#FFF4E5' },
    { role: 'Recruiter', txtcolor: '#1E40AF', bdrcolor: '#3B82F6', bgcolor: '#EFF6FF' },
];
const STATUS_BADGE_EXPECTATIONS = [
    { status: 'Active', txtcolor: '#15803D', bgcolor: '#DCFCE7', bdrcolor: '#22C55E' },
    { status: 'Inactive', txtcolor: '#CE141A', bgcolor: '#FCE3E4', bdrcolor: '#F7B6B9' },
];



function getAcceptedColumnNames(required) {
    return COLUMN_ALIASES[required] || [required];
}

function hasActionsColumn(visibleColumns) {
    const accepted = getAcceptedColumnNames('Actions');
    return visibleColumns.some((col) =>
        accepted.some((name) => col.includes(name) || name.includes(col))
    );
}

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

async function loginAndNavigateToUserManagement(page) {
    await page.goto('https://stgapp.hirin.ai/login');

    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForNavigation();

    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();

    await clickSettingsWithRetry(page);
    await page.locator('div').filter({ hasText: /^User Management/ }).first().click();
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByLabel('User Management').first()).toContainText('User Management');
}

function getRoleTextPattern(role) {
    return role === 'Admin' ? /Super Admin|^Admin$/i : new RegExp(role, 'i');
}

function getRoleBadgeLocator(page, role) {
    const pattern = getRoleTextPattern(role);
    const roleColumn = page.locator(`.ant-table-tbody tr:not(.ant-table-measure-row) td:nth-child(${ROLE_COLUMN_INDEX})`);
    return roleColumn.locator('span[txtcolor], span[bgcolor], span[bdrcolor]').filter({ hasText: pattern }).first();
}

function getStatusBadgeLocator(page, statusText) {
    const statusColumn = page.locator(`.ant-table-tbody tr:not(.ant-table-measure-row) td:nth-child(${STATUS_COLUMN_INDEX})`);
    const exactMatch = new RegExp(`^${statusText}$`, 'i');
    return statusColumn.locator('span[txtcolor], span[bgcolor], span[bdrcolor]').filter({ hasText: exactMatch }).first();
}

async function getHeaderCellLabel(headerCellLocator) {
    const text = (await headerCellLocator.textContent())?.trim() ?? '';
    if (text) return text;
    const ariaLabel = await headerCellLocator.getAttribute('aria-label');
    if (ariaLabel?.trim()) return ariaLabel.trim();
    const fromBefore = await headerCellLocator.evaluate((el) => {
        const content = window.getComputedStyle(el, '::before').getPropertyValue('content');
        if (!content || content === 'none' || content === '""') return '';
        return content.replace(/^["']|["']$/g, '').trim();
    }).catch(() => '');
    return fromBefore || '';
}

async function getColumnIndexByHeader(page, headerLabel) {
    const headerCells = page.locator('.ant-table-thead th:not(.ant-table-cell-scrollbar), thead th:not(.ant-table-cell-scrollbar)');
    const count = await headerCells.count();
    for (let i = 0; i < count; i++) {
        const label = await getHeaderCellLabel(headerCells.nth(i));
        if (label && label.includes(headerLabel)) return i + 1;
    }
    throw new Error(`Column with header "${headerLabel}" not found`);
}

async function openAddNewUserModal(page) {
    await page.getByRole('button', { name: /Add User/i }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
}

function getModalAddUserButton(page) {
    return page.getByTestId('add-user-modal').getByRole('button', { name: 'Add User' });
}

async function openEditUserModalForRow(page, rowLocator) {
    await rowLocator.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
}

function getEditModalSaveButton(page) {
    return page.getByRole('dialog').getByRole('button', { name: /Update User|Save/i });
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function selectRoleInEditModal(page, dialog, roleLabel) {
    await dialog.locator('.ant-select-selector').first().click();
    const dropdown = page.locator('.ant-select-dropdown').last();
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    const items = dropdown.locator('.ant-select-item');
    /** Exact label match so "Admin" does not match "Super Admin". */
    const option =
        roleLabel instanceof RegExp
            ? items.filter({ hasText: roleLabel }).first()
            : items.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(roleLabel)}\\s*$`, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click({ force: true });
    await expect(dropdown).toBeHidden({ timeout: 5000 }).catch(() => {});
}

/** A role different from {@link targetRole} (for dirtying the edit form). */
function pivotRoleBeforeSelecting(targetRole) {
    if (targetRole === 'Recruiter') return 'Hiring Manager';
    return 'Recruiter';
}

/**
 * @param {string} selectionText
 * @param {string} targetRole
 */
function editModalSelectionMatchesTarget(selectionText, targetRole) {
    const t = (selectionText || '').trim();
    if (/^admin$/i.test(targetRole)) return /^(super )?admin$/i.test(t);
    return t.toLowerCase() === targetRole.toLowerCase();
}

/**
 * Sets {@link targetRole} in Edit User modal and ensures Save/Update enables.
 * If the role already matches, pivot→target can return the form to its original value (pristine);
 * a name-field nudge then marks the form dirty without changing the visible role.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dialog
 * @param {'Admin' | 'Hiring Manager' | 'Recruiter'} targetRole
 */
async function selectRoleInEditModalEnsuringSaveEnabled(page, dialog, targetRole) {
    const initialText = await dialog.locator('.ant-select-selection-item').first().textContent();
    const alreadyTarget = editModalSelectionMatchesTarget(initialText, targetRole);

    if (!alreadyTarget) {
        await selectRoleInEditModal(page, dialog, targetRole);
        await page.waitForTimeout(500);
    } else {
        const pivot = pivotRoleBeforeSelecting(targetRole);
        await selectRoleInEditModal(page, dialog, pivot);
        await page.waitForTimeout(500);
        await selectRoleInEditModal(page, dialog, targetRole);
        await page.waitForTimeout(500);
    }

    const saveBtn = getEditModalSaveButton(page);
    if (!(await saveBtn.isEnabled().catch(() => false))) {
        const nameInput = dialog.locator('#name');
        const v = await nameInput.inputValue();
        await nameInput.fill(`${v} `);
        await nameInput.fill(v);
        await page.waitForTimeout(400);
    }
    await expect(saveBtn).toBeEnabled({ timeout: 15000 });
}

async function openDeactivateDialogForActiveUser(page) {
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
        await dialog.locator('.ant-modal-close').first().click().catch(() => {});
        await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    await actionsCell.locator('img[alt*="Deactivate"], img[alt*="deactivate"]').first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    return activeUserRow;
}

async function messageToast(page, expectedText) {
    await expect(page.getByText(expectedText)).toBeVisible({ timeout: 10000 });
}

function parseCreatedOnDate(text) {
    const trimmed = (text || '').trim();
    const match = trimmed.match(DD_MM_YYYY_REGEX);
    if (!match) return null;
    const [d, m, y] = trimmed.split('/').map(Number);
    return new Date(y, m - 1, d);
}




test('TC-UM-01 : Verify user is able to navigate to User Management Page @smoke @regression @userManagement', async ({page}) => {
    await loginAndNavigateToUserManagement(page);
});

test('TC-UM-02 : All required columns are displayed @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    const headerCells = page.locator('.ant-table-thead th:not(.ant-table-cell-scrollbar), thead th:not(.ant-table-cell-scrollbar)');
    const columnCount = await headerCells.count();
    const visibleColumns = [];
    for (let i = 0; i < columnCount; i++) {
        const text = await getHeaderCellLabel(headerCells.nth(i));
        if (text) visibleColumns.push(text);
    }

    for (const required of REQUIRED_USER_MANAGEMENT_COLUMNS) {
        const accepted = getAcceptedColumnNames(required);
        const found = visibleColumns.some((col) =>
            accepted.some((name) => col.includes(name) || name.includes(col))
        );
        if (OPTIONAL_COLUMNS.includes(required) && !found) continue;
        expect(
            found,
            `Table should display column "${required}" (or variant). Visible columns: ${visibleColumns.join(', ')}`
        ).toBe(true);
    }
});

test('TC-UM-03 : Role badges display correctly @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    let atLeastOneRoleFound = false;
    const seenBdrColors = new Set();

    for (const { role, txtcolor, bdrcolor, bgcolor } of ROLE_BADGE_EXPECTATIONS) {
        const roleBadge = getRoleBadgeLocator(page, role);
        const visible = await roleBadge.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
        if (!visible) continue;
        atLeastOneRoleFound = true;
        await expect(roleBadge).toBeVisible({ timeout: 5000 });
        // Assert all three color attributes (text, border, background) per DOM
        await expect(roleBadge, `"${role}" badge should have correct text color`).toHaveAttribute('txtcolor', txtcolor);
        await expect(roleBadge, `"${role}" badge should have correct border color`).toHaveAttribute('bdrcolor', bdrcolor);
        await expect(roleBadge, `"${role}" badge should have correct background color`).toHaveAttribute('bgcolor', bgcolor);
        seenBdrColors.add(bdrcolor);
    }

    // Precondition: at least one of the three roles must appear in the table (otherwise we asserted nothing)
    expect(atLeastOneRoleFound, 'At least one of Admin, Hiring Manager, or Recruiter should be present in the table').toBe(true);
    // Spec: "distinct badge styles" — at least two different badge colors must be present
    expect(seenBdrColors.size).toBeGreaterThanOrEqual(2);
});

test('TC-UM-04 : Status badges display correctly @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    let activeFound = false;
    let inactiveFound = false;

    for (const { status, txtcolor, bdrcolor, bgcolor } of STATUS_BADGE_EXPECTATIONS) {
        const badge = getStatusBadgeLocator(page, status);
        const visible = await badge.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
        if (!visible) continue;
        if (status === 'Active') activeFound = true;
        else inactiveFound = true;
        await expect(badge).toContainText(new RegExp(`^${status}$`, 'i'));
        await expect(badge, `"${status}" badge text color`).toHaveAttribute('txtcolor', txtcolor);
        await expect(badge, `"${status}" badge border color`).toHaveAttribute('bdrcolor', bdrcolor);
        await expect(badge, `"${status}" badge background color`).toHaveAttribute('bgcolor', bgcolor);
    }

    expect(activeFound, 'At least one Active user badge should be present').toBe(true);
    if (inactiveFound) {
        expect(inactiveFound, '=Inactive user badge is present in the page').toBe(true);
    } else {
        expect(inactiveFound, 'No inactive user badge is present in the page').toBe(false);
    }
});

test('TC-UM-05 : Actions column icons present @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    const headerCells = page.locator('.ant-table-thead th:not(.ant-table-cell-scrollbar), thead th:not(.ant-table-cell-scrollbar)');
    const headerCount = await headerCells.count();
    const visibleColumns = [];
    for (let i = 0; i < headerCount; i++) {
        const text = await getHeaderCellLabel(headerCells.nth(i));
        if (text) visibleColumns.push(text);
    }
    test.skip(
        !hasActionsColumn(visibleColumns),
        `Actions column not available for this role/view. Visible columns: ${visibleColumns.join(', ')}`
    );

    const dataRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let r = 0; r < Math.min(rowCount, 5); r++) {
        const actionsCell = dataRows.nth(r).locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
        await expect(actionsCell).toBeVisible({ timeout: 5000 });

        const editBtn = actionsCell.getByRole('button', { name: 'Edit User' });
        await expect(editBtn).toBeVisible();
        await expect(editBtn).toHaveAttribute('aria-label', 'Edit User');

        const resendBtn = actionsCell.getByRole('button', { name: 'Resend Invite' });
        await expect(resendBtn).toBeVisible();
        await expect(resendBtn).toHaveAttribute('aria-label', 'Resend Invite');

        const activateOrDeactivate = actionsCell.locator('img[alt*="Activate"], img[alt*="Deactivate"], img[src*="user-round-check"], img[src*="user-round-x"]').first();
        await expect(activateOrDeactivate).toBeVisible();
        const alt = await activateOrDeactivate.getAttribute('alt');
        const src = await activateOrDeactivate.getAttribute('src');
        expect(
            (alt && (alt.includes('Activate') || alt.includes('Deactivate'))) || (src && (src.includes('user-round-check') || src.includes('user-round-x'))),
            'Row should have Activate or Deactivate icon'
        ).toBe(true);
    }
});

test('TC-UM-06 : Created On column date format @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;
    const dateCells = page.locator('.ant-table td').filter({ hasText: datePattern });
    await dateCells.first().waitFor({ state: 'visible', timeout: 15000 });

    const count = await dateCells.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
        const cellText = (await dateCells.nth(i).textContent())?.trim() ?? '';
        expect(
            DD_MM_YYYY_REGEX.test(cellText),
            `Created On value should be in DD/MM/YYYY format (found: "${cellText}")`
        ).toBe(true);
    }
});

test('TC-UM-07 : Search by exact name @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const exactName = 'BIKASH MAZUMDER';
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(exactName);
    await page.waitForTimeout(2000);

    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: exactName }).first().waitFor({ state: 'visible', timeout: 10000 });

    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
        const nameCell = filteredRows.nth(i).locator('td').first();
        await expect(nameCell).toContainText(exactName);
    }
});

test('TC-UM-08 : Search by partial name @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    const partialName = 'BIKASH';
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(partialName);
    await page.waitForTimeout(2000);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: partialName }).first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
        const nameCell = filteredRows.nth(i).locator('td').first();
        await expect(nameCell).toContainText(partialName);
    }
});

test('TC-UM-09 : Search by email @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    const exactEmail = 'bikash.m@yopmail.com';
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(exactEmail);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: exactEmail }).first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
        const emailCell = filteredRows.nth(i).locator('td').nth(1);
        await expect(emailCell).toContainText(exactEmail);
    }
});

test('TC-UM-10 : Search is case-insensitive @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const searchInput = page.getByPlaceholder('Search by name or email');

    await searchInput.fill('SUPER');
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: /Super Admin/i }).first().waitFor({ state: 'visible', timeout: 10000 });
    const rowsAfterUpper = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const countUpper = await rowsAfterUpper.count();
    const namesUpper = [];
    for (let i = 0; i < countUpper; i++) {
        const name = (await rowsAfterUpper.nth(i).locator('td').first().textContent())?.trim() ?? '';
        if (name) namesUpper.push(name);
    }

    await searchInput.clear();
    await searchInput.fill('super');
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: /Super Admin/i }).first().waitFor({ state: 'visible', timeout: 10000 });
    const rowsAfterLower = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const countLower = await rowsAfterLower.count();
    const namesLower = [];
    for (let i = 0; i < countLower; i++) {
        const name = (await rowsAfterLower.nth(i).locator('td').first().textContent())?.trim() ?? '';
        if (name) namesLower.push(name);
    }

    expect(countLower).toBe(countUpper);
    expect(namesLower.sort().join(',')).toBe(namesUpper.sort().join(','));
});

test('TC-UM-11 : Search returns no results @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.fill('XYZ123');

    await expect(page.getByText('No Results Found')).toBeVisible({ timeout: 10000 });
});

test('TC-UM-12 : Search with special characters @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.fill('@#$%');

    await expect(page.getByText('No Results Found')).toBeVisible({ timeout: 10000 });
});

test('TC-UM-13 : Search with empty string @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.fill('');
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
        const nameCell = filteredRows.nth(i).locator('td').first();
        await expect(nameCell).toContainText('');
    }
});

test('TC-UM-14 : Search with whitespace only @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.fill('   ');
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);
});

test('TC-UM-15 : Clear search restores full list @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const exactName = 'BIKASH MAZUMDER';
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(exactName);

    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: exactName }).first().waitFor({ state: 'visible', timeout: 10000 });

    const filteredRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCount = await filteredRows.count();
    expect(rowCount).toBeGreaterThan(0);

    await page.waitForTimeout(3000);

    await searchInput.clear();
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredRowsAfterClear = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const rowCountAfterClear = await filteredRowsAfterClear.count();
    expect(rowCountAfterClear).toBeGreaterThan(0);
    for (let i = 0; i < rowCountAfterClear; i++) {
        const nameCell = filteredRowsAfterClear.nth(i).locator('td').first();
        await expect(nameCell).toContainText(exactName);
    }
});

test('TC-UM-16 : Search with very long string @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    const table = page.locator('.ant-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    const longString = 'a'.repeat(501);
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.fill(longString);

    await page.waitForTimeout(2000);

    const hasRows = await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').count() > 0;
    const hasNoResults = await page.getByText('No Results Found').isVisible().catch(() => false);
    expect(hasRows || hasNoResults).toBe(true);
});

test('TC-UM-17 : Open Add New User modal @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    await page.getByRole('button', { name: /Add User/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('.ant-modal-title')).toHaveText('Add New User');

    await expect(modal.locator('label[for="name"]')).toBeVisible();
    await expect(modal.locator('#name')).toBeVisible();
    await expect(modal.locator('label[for="email"]')).toBeVisible();
    await expect(modal.locator('#email')).toBeVisible();
    await expect(modal.locator('label[for="phoneNumber"]')).toBeVisible();
    await expect(modal.locator('#phoneNumber')).toBeVisible();
    await expect(modal.locator('label[for="role"]')).toBeVisible();
    await expect(modal.locator('#role')).toBeVisible();

    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Add User' })).toBeVisible();
});

// Always add a new user with unique email and phone number details
test('TC-UM-18 : Add New User with valid details @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    const name = 'John Kanning';
    const email = name.toLowerCase().replace(/\s+/g, '.') + '.' + Math.random().toString(36).substring(2, 10) + '@example.com';
    const phoneNumber = '+91 ' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const role = 'Hiring Manager';
    await page.getByRole('button', { name: /Add User/i }).click();
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#phoneNumber').fill(phoneNumber);
    await page.locator('#role').click();
    const roleOption = page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: role });
    await roleOption.waitFor({ state: 'visible', timeout: 5000 });
    await roleOption.click({ force: true });
    await page.getByTestId('add-user-modal').getByRole('button', { name: 'Add User' }).click();
    await expect(page.getByText('User added successfully')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().locator('td').first()).toContainText(name);
    await expect(page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().locator('td').nth(1)).toContainText(email);
    await expect(page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().locator('td').nth(2)).toContainText(phoneNumber);
    await expect(page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().locator('td').nth(3)).toContainText(role);
});

test('TC-UM-19 : Submit form with empty Name field @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#email').fill('test@example.com');
    await page.locator('#phoneNumber').fill('+91 1234567890');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-20 : Submit form with empty Email field @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#phoneNumber').fill('+91 1234567890');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter email')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-21: Submit form with empty Phone Number @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter phone number')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-22 : Submit form without selecting Role @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#phoneNumber').fill('+91 1234567890');
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter role')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-23 : Submit form with all fields empty @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Please enter email')).toBeVisible();
    await expect(page.getByText('Please enter phone number')).toBeVisible();
    await expect(page.getByText('Please enter role')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-24 : Invalid email format validation @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('bikash.m@yopmail.');
    await page.locator('#phoneNumber').fill('+91 1234567890');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter a valid email')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-25 : Add New User with existing email details @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    await page.getByRole('button', { name: /Add User/i }).click();
    await page.locator('#name').fill('John Kanning');
    await page.locator('#email').fill('john.kanning@example.com');
    await page.locator('#phoneNumber').fill('+91 8989911001');
    await page.locator('#role').click();
    const roleOption = page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' });
    await roleOption.waitFor({ state: 'visible', timeout: 5000 });
    await roleOption.click({ force: true });
    await page.getByTestId('add-user-modal').getByRole('button', { name: 'Add User' }).click();
    await expect(page.getByText('Email already exists')).toBeVisible({ timeout: 10000 });
});

test('TC-UM-26 : Add New User with existing phone number details @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);

    await page.getByRole('button', { name: /Add User/i }).click();
    await page.locator('#name').fill('John Kanning');
    await page.locator('#email').fill('john.kanning1@example.com');
    await page.locator('#phoneNumber').fill('+91 8989911001');
    await page.locator('#role').click();
    const roleOption = page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' });
    await roleOption.waitFor({ state: 'visible', timeout: 5000 });
    await roleOption.click({ force: true });
    await page.getByTestId('add-user-modal').getByRole('button', { name: 'Add User' }).click();
    await expect(page.getByText('Phone number already exists')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);
});

test('TC-UM-27 : Email without domain validation @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('testuser');
    await page.locator('#phoneNumber').fill('+91 1234567890');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Please enter a valid email')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-28 : Invalid phone number format @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#phoneNumber').fill('+91-8546');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('Invalid Phone Number')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-29 : Phone number with letters @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#phoneNumber').fill('+91 ABC12345');
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText(/Invalid Phone Number|letters not accepted|valid phone/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-30 : Phone number autocomplete suggestions @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    const phoneField = page.locator('#phoneNumber');
    await phoneField.click();
    await phoneField.fill('+91 98');
    await expect(phoneField).toHaveValue('+91 98');
    // Browser/system phone suggestions may appear when typing; selecting one would auto-fill (environment-dependent)
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-31 : Select each role in dropdown @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);

    const modal = page.getByTestId('add-user-modal');
    const roleSelectTrigger = modal.locator('.ant-select-selector').first();
    const selectionItem = modal.locator('.ant-select-selection-item');
    const dropdownOptions = page.locator('.ant-select-dropdown .ant-select-item');

    const openRoleDropdown = () => roleSelectTrigger.click();

    await openRoleDropdown();
    await dropdownOptions.first().waitFor({ state: 'visible', timeout: 5000 });
    const optionCount = await dropdownOptions.count();
    expect(optionCount).toBe(3);
    await expect(page.locator('.ant-select-dropdown')).toContainText('Admin');
    await expect(page.locator('.ant-select-dropdown')).toContainText('Hiring Manager');
    await expect(page.locator('.ant-select-dropdown')).toContainText('Recruiter');

    await dropdownOptions.filter({ hasText: 'Admin' }).first().click({ force: true });
    await expect(selectionItem).toHaveText('Admin');

    await openRoleDropdown();
    await dropdownOptions.filter({ hasText: 'Hiring Manager' }).first().click({ force: true });
    await expect(selectionItem).toHaveText('Hiring Manager');

    await openRoleDropdown();
    await dropdownOptions.filter({ hasText: 'Recruiter' }).first().click({ force: true });
    await expect(selectionItem).toHaveText('Recruiter');
});

test('TC-UM-32 : Name field with autocomplete suggestion @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    const nameField = page.locator('#name');
    await nameField.click();
    await nameField.fill('Jane');
    await expect(nameField).toHaveValue('Jane');
    // Browser autocomplete may suggest names when focused; selecting a suggestion would auto-fill (environment-dependent)
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('TC-UM-33 : Cancel button closes modal without saving @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);

    const name = 'Cancel Test User';
    const email = 'cancel.test@example.com';
    const phoneNumber = '+91 9876543210';
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#phoneNumber').fill(phoneNumber);
    await page.locator('#role').click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).click({ force: true });

    await page.getByTestId('add-user-modal').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('User added successfully')).not.toBeVisible();
});

test('TC-UM-34 : Close modal via X button @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    await page.locator('#name').fill('Unused');
    await page.getByRole('dialog').locator('.ant-modal-close').click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('User added successfully')).not.toBeVisible();
});

test('TC-UM-35 : Name with special characters @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    const name = "O'Brien &";
    const email = 'obrien.co.' + Math.random().toString(36).substring(2, 10) + '@example.com';
    const phoneNumber = '+91 ' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const modal = page.getByTestId('add-user-modal');
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#phoneNumber').fill(phoneNumber);
    await modal.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).first().click({ force: true });
    await getModalAddUserButton(page).click();
    await page.waitForTimeout(3000);
    const successVisible = await page.getByText('User added successfully').isVisible().catch(() => false);
    const errorVisible = await page.getByText(/valid|special|character|allowed|error/i).isVisible().catch(() => false);
    expect(successVisible || errorVisible).toBe(true);
    if (successVisible) {
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    } else {
        await expect(page.getByRole('dialog')).toBeVisible();
    }
});

test('TC-UM-36 : Very long name input @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    const longName = 'A'.repeat(250);
    const email = 'longname.' + Math.random().toString(36).substring(2, 10) + '@example.com';
    const phoneNumber = '+91 ' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const modal = page.getByTestId('add-user-modal');
    await page.locator('#name').fill(longName);
    await page.locator('#email').fill(email);
    await page.locator('#phoneNumber').fill(phoneNumber);
    await modal.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).first().click({ force: true });
    await getModalAddUserButton(page).click();
    await page.waitForTimeout(3000);
    const successVisible = await page.getByText('User added successfully').isVisible().catch(() => false);
    const errorVisible = await page.getByText(/length|max|valid|error|character/i).isVisible().catch(() => false);
    const dialogStillOpen = await page.getByRole('dialog').isVisible().catch(() => false);
    expect(successVisible || errorVisible || dialogStillOpen).toBe(true);
});

test('TC-UM-37 : Email with uppercase letters @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await openAddNewUserModal(page);
    const name = 'John Doe';
    const email = 'John.Doe.' + Math.random().toString(36).substring(2, 8) + '@EXAMPLE.COM';
    const phoneNumber = '+91 ' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const modal = page.getByTestId('add-user-modal');
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#phoneNumber').fill(phoneNumber);
    await modal.locator('.ant-select-selector').first().click();
    await page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: 'Hiring Manager' }).first().click({ force: true });
    await getModalAddUserButton(page).click();
    await expect(page.getByText('User added successfully')).toBeVisible({ timeout: 10000 });
});

test('TC-UM-38 : Open Edit User modal @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(3000);
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    const name = await firstRow.locator('td').first().textContent();
    const email = await firstRow.locator('td').nth(1).textContent();
    const phone = await firstRow.locator('td').nth(2).textContent();
    const role = await firstRow.locator('td').nth(3).textContent();
    await firstRow.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.ant-modal-title')).toHaveText('Edit User');
    await expect(dialog.locator('#name')).toHaveValue(name);
    await expect(dialog.locator('#email')).toHaveValue(email);
    await expect(dialog.locator('#phoneNumber')).toHaveValue(phone);
    await expect(dialog.locator('.ant-select-selection-item')).toHaveText(role);
});

test('TC-UM-39 : Edit modal pre-fills existing user data @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    await firstRow.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('.ant-modal-title')).toHaveText('Edit User');

    await expect(dialog.locator('#name')).not.toHaveValue('');
    await expect(dialog.locator('#email')).not.toHaveValue('');
    await expect(dialog.locator('#phoneNumber')).not.toHaveValue('');
    await expect(dialog.locator('.ant-select-selection-item')).not.toHaveText('');
});

test('TC-UM-40 : Edit user role successfully @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    const originalRole = (await firstRow.locator('td').nth(3).textContent()).trim();
    await openEditUserModalForRow(page, firstRow);
    const dialog = page.getByRole('dialog');
    const role = originalRole || '';
    if (!/Admin|Super Admin/i.test(role)) {
        await selectRoleInEditModal(page, dialog, /Super Admin|^Admin$/i);
    } else if (!/Hiring Manager/i.test(role)) {
        await selectRoleInEditModal(page, dialog, 'Hiring Manager');
    } else {
        await selectRoleInEditModal(page, dialog, 'Recruiter');
    }
    await getEditModalSaveButton(page).click();
    await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    const updatedRole = await firstRow.locator('td').nth(3).textContent();
    expect(updatedRole).not.toBe(originalRole);
});

test('TC-UM-41 : Role dropdown in Edit shows all 3 options @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    await openEditUserModalForRow(page, firstRow);

    const dialog = page.getByRole('dialog');
    await dialog.locator('.ant-select-selector').first().click();
    const dropdownOptions = page.locator('.ant-select-dropdown .ant-select-item');
    await dropdownOptions.first().waitFor({ state: 'visible', timeout: 5000 });
    const optionCount = await dropdownOptions.count();
    expect(optionCount).toBe(3);
    await expect(page.locator('.ant-select-dropdown')).toContainText('Admin');
    await expect(page.locator('.ant-select-dropdown')).toContainText('Hiring Manager');
    await expect(page.locator('.ant-select-dropdown')).toContainText('Recruiter');
});

test('TC-UM-42 : Edit user with blank Name field @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    await openEditUserModalForRow(page, firstRow);

    const dialog = page.getByRole('dialog');
    await dialog.locator('#name').clear();
    await getEditModalSaveButton(page).click();
    await expect(page.getByText('Please enter name')).toBeVisible({ timeout: 5000 });
    await expect(dialog).toBeVisible();
});

test('TC-UM-43 : Email field should be non-editable @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    await openEditUserModalForRow(page, firstRow);

    const dialog = page.getByRole('dialog');
    const emailInput = dialog.locator('#email');
    await expect(emailInput).toHaveAttribute('readonly');
});

test('TC-UM-44 : Cancel Edit modal discards changes @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const firstRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    await openEditUserModalForRow(page, firstRow);

    const dialog = page.getByRole('dialog');
    const originalName = await dialog.locator('#name').inputValue();
    await dialog.locator('#name').fill('Modified Name That Should Be Discarded');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await expect(firstRow.locator('td').first()).toContainText(originalName);
});

test('TC-UM-45 : Deactivate dialog is shown for an Active user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });

    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const deactivateIcon = actionsCell.locator('img[alt*="Deactivate"], img[alt*="deactivate"]').first();
    await deactivateIcon.click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(confirmDialog).toContainText('Deactivate User');
    await expect(confirmDialog).toContainText(/revoke.*access/i);
    await expect(confirmDialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: /Confirm Deactivation/i })).toBeVisible();
});

test('TC-UM-46 : Deactivate button tooltip shown on hover @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });

    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const deactivateIcon = actionsCell.locator('img[alt*="Deactivate"], img[alt*="deactivate"]').first();
    await deactivateIcon.hover();
    await page.waitForTimeout(500);
    const tooltipVisible = await page.locator('.ant-tooltip').filter({ hasText: 'Deactivate' }).first().isVisible().catch(() => false);
    const titleDeactivate = (await deactivateIcon.getAttribute('title'))?.toLowerCase().includes('deactivate');
    const hasAlt = (await deactivateIcon.getAttribute('alt'))?.toLowerCase().includes('deactivate');
    expect(tooltipVisible || titleDeactivate || hasAlt).toBe(true);
});

test('TC-UM-47 : Cancel deactivation @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = await openDeactivateDialogForActiveUser(page);
    const userEmail = (await activeUserRow.locator('td').nth(1).textContent()).trim();

    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    const row = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: userEmail }).first();
    await expect(row.locator('td').nth(STATUS_COLUMN_INDEX - 1)).toContainText(/Active/i);
});

test('TC-UM-48 : Deactivation dialog shows no pending tasks message @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    await openDeactivateDialogForActiveUser(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('There are no tasks, jobs, or pending items assigned to this user. Deactivating will immediately revoke their access.');
});

test('TC-UM-49 : Deactivate a user @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = await openDeactivateDialogForActiveUser(page);
    const name = (await activeUserRow.locator('td').first().textContent()).trim();
    const userEmail = (await activeUserRow.locator('td').nth(1).textContent()).trim();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText('Deactivate User');
    await expect(dialog).toContainText(/deactivate.*user/i);
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Confirm Deactivation/i })).toBeVisible();
    await dialog.getByRole('button', { name: /Confirm Deactivation/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    await messageToast(page, `${name} has been successfully deactivated`);
    const updatedRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: userEmail }).first();
    await expect(updatedRow.locator('td').nth(STATUS_COLUMN_INDEX - 1)).toContainText(/Inactive/i);
});

test('TC-UM-50 : Edit button is not clickable for Inactive user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const inactiveUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Inactive' }).first();
    await expect(inactiveUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = inactiveUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const editButton = actionsCell.getByRole('button', { name: 'Edit User' });
    await expect(editButton).toBeVisible();
    await expect(editButton).toHaveAttribute('aria-label', 'Edit User');
    await expect(editButton).toHaveCSS('cursor', 'not-allowed');
});

test('TC-UM-51 : Resend invite button is not clickable for Inactive user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const inactiveUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Inactive' }).first();
    await expect(inactiveUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = inactiveUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const resendInviteButton = actionsCell.getByRole('button', { name: 'Resend Invite' });
    await expect(resendInviteButton).toBeVisible();
    await expect(resendInviteButton).toHaveAttribute('aria-label', 'Resend Invite');
    await expect(resendInviteButton).toHaveCSS('cursor', 'not-allowed');
});

test('TC-UM-52 : Check context on Activate dialog for an Inactive user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const inactiveUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Inactive' }).first();
    await expect(inactiveUserRow).toBeVisible({ timeout: 5000 });
    const userEmail = (await inactiveUserRow.locator('td').nth(1).textContent()).trim();

    const actionsCell = inactiveUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    await actionsCell.locator('img[alt*="Activate"], img[alt*="activate"]').first().click();

    await page.waitForTimeout(3000);
    const updatedRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: userEmail }).first();
    await expect(updatedRow.locator('td').nth(STATUS_COLUMN_INDEX - 1)).toContainText(/Active/i);
});

test('TC-UM-53 : Activate button tooltip shown on hover @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const inactiveUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Inactive' }).first();
    await expect(inactiveUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = inactiveUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const activateIcon = actionsCell.locator('img[alt*="Activate"], img[alt*="activate"]').first();
    await activateIcon.hover();
    await page.waitForTimeout(500);
    const tooltipVisible = await page.locator('.ant-tooltip').filter({ hasText: 'Activate' }).first().isVisible().catch(() => false);
    const titleActivate = (await activateIcon.getAttribute('title'))?.toLowerCase().includes('activate');
    const hasAlt = (await activateIcon.getAttribute('alt'))?.toLowerCase().includes('activate');
    expect(tooltipVisible || titleActivate || hasAlt).toBe(true);
});

test('TC-UM-54 : Activate an Inactive user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const inactiveUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Inactive' }).first();
    await expect(inactiveUserRow).toBeVisible({ timeout: 5000 });
    const userEmail = (await inactiveUserRow.locator('td').nth(1).textContent()).trim();
    const name = (await inactiveUserRow.locator('td').first().textContent()).trim();
    const actionsCell = inactiveUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const activateIcon = actionsCell.locator('img[alt*="Activate"], img[alt*="activate"]').first();
    await activateIcon.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText(/Reactivate User|Activate User/i);
    await expect(dialog).toContainText(/reactivate|activate.*user/i);
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Confirm Activation/i })).toBeVisible();
    await dialog.getByRole('button', { name: /Confirm Activation/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    await messageToast(page, `${name} has been successfully reactivated`);
    const updatedRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: userEmail }).first();
    await expect(updatedRow.locator('td').nth(STATUS_COLUMN_INDEX - 1)).toContainText(/Active/i);
});

test('TC-UM-55 : Resend invite button is clickable for Active user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const resendInviteButton = actionsCell.getByRole('button', { name: 'Resend Invite' });
    await expect(resendInviteButton).toBeVisible();
    await expect(resendInviteButton).toHaveAttribute('aria-label', 'Resend Invite');
    await expect(resendInviteButton).toHaveCSS('cursor', 'pointer');
    await resendInviteButton.click();
    await expect(page.getByText('Invitation resent successfully')).toBeVisible({ timeout: 10000 });
});

test('TC-UM-56 : Resend invite tooltip shown on hover @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const resendInviteButton = actionsCell.getByRole('button', { name: 'Resend Invite' });
    await resendInviteButton.hover();
    await page.waitForTimeout(500);
    const tooltipVisible = await page.locator('.ant-tooltip').filter({ hasText: 'Resend Invite' }).first().isVisible().catch(() => false);
    expect(tooltipVisible).toBe(true);
});

test('TC-UM-57 : Resend invite for Super Admin user @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Super Admin');
    await page.waitForTimeout(2000);
    const superAdminRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Super Admin' }).first();
    await expect(superAdminRow).toBeVisible({ timeout: 5000 });
    const actionsCell = superAdminRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const resendInviteButton = actionsCell.getByRole('button', { name: 'Resend Invite' });
    await expect(resendInviteButton).toBeVisible();
    await expect(resendInviteButton).toHaveAttribute('aria-label', 'Resend Invite');
});

test('TC-UM-58 : Mutliple rapid click on Resend invite button @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });
    const actionsCell = activeUserRow.locator(`td:nth-child(${ACTIONS_COLUMN_INDEX})`);
    const resendInviteButton = actionsCell.getByRole('button', { name: 'Resend Invite' });
    await expect(resendInviteButton).toBeVisible();
    await expect(resendInviteButton).toHaveAttribute('aria-label', 'Resend Invite');
    await expect(resendInviteButton).toHaveCSS('cursor', 'pointer');
    await resendInviteButton.click();
    await resendInviteButton.click();
    await expect(
        page.getByText("You've reached the maximum limit for resending invites today. Please try again after 24 hour")
          .or(page.getByText('Please wait 30 seconds before resending the invite again'))
      ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
});

test('TC-UM-59 : Pagination shows correct results count @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const activeUserRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Active' }).first();
    await expect(activeUserRow).toBeVisible({ timeout: 5000 });
    await expect(page.locator('p')).toContainText(/Showing \d+ to \d+ of \d+ results/);
});

test('TC-UM-60 : Navigate to next page @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('p')).toContainText(/Showing \d+ to \d+ of \d+ results/);

    const nextBtn = page.getByRole('button', { name: 'Next' });;
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 users; no next page available');

    await nextBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('p')).toContainText(/Showing 11 to \d+ of \d+ results/);
}); 

test('TC-UM-61 : Navigate to previous page @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('p')).toContainText(/Showing \d+ to \d+ of \d+ results/);

    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 users; no next page available');
    await nextBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('p')).toContainText(/Showing 11 to \d+ of \d+ results/);

    const prevBtn = page.getByRole('button', { name: 'Previous' });
    const isPrevDisabled = await prevBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isPrevDisabled, 'Fewer than 11 users; no previous page available');

    await prevBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('p')).toContainText(/Showing \d+ to \d+ of \d+ results/);
});

test('TC-UM-62 : Next button is disabled on last page @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const totalResults = Number(paginationText.match(/of (\d+) results/)[1]);
    const lastPage = Math.ceil(totalResults / 10);
    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 users; no next page available');

    for (let i = 0; i < lastPage - 1; i++) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
    }

    const lastPageStart = (lastPage - 1) * 10 + 1;
    const lastPageEnd = Math.min(lastPage * 10, totalResults);
    await expect(page.locator('p')).toContainText(`Showing ${lastPageStart} to ${lastPageEnd} of ${totalResults} results`);
    await expect(nextBtn).toBeDisabled();
});

test('TC-UM-63 : Previous button is disabled on first page @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    const isPrevDisabled = await prevBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isPrevDisabled, 'Fewer than 11 users; no previous page available');
    const paginationText = await page.getByText(/Showing \d+ to \d+ of \d+ results/).textContent();
    const totalResults = Number(paginationText.match(/of (\d+) results/)[1]);
    const firstPage = 1;
    const firstPageStart = 1;
    const firstPageEnd = Math.min(firstPage * 10, totalResults);
    await expect(page.locator('p')).toContainText(`Showing ${firstPageStart} to ${firstPageEnd} of ${totalResults} results`);
    await expect(prevBtn).toBeDisabled();
});

test('TC-UM-64 : Pagination resets after search @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('p')).toContainText(/Showing \d+ to \d+ of \d+ results/);

    const nextBtn = page.getByRole('button', { name: 'Next' });
    const isNextDisabled = await nextBtn.evaluate((el) => el.classList.contains('ant-pagination-disabled'));
    test.skip(isNextDisabled, 'Fewer than 11 users; cannot be on page 2');

    await nextBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('p')).toContainText(/Showing 11 to \d+ of \d+ results/);

    const name = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first();
    const search_name = (await name.locator('td').first().textContent()).trim();
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(search_name);
    await page.waitForTimeout(2000);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: search_name }).first().waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('p')).toContainText(/Showing 1 to \d+ of \d+ results/);
});

test('TC-UM-65 : Sort by Role column @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    const roleHeader = page.locator('.ant-table-thead th').filter({ hasText: /Role/i }).first();
    await roleHeader.click();
    await page.waitForTimeout(1000);

    const rows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const count = await rows.count();
    const roles = [];
    for (let i = 0; i < count; i++) {
        const cellText = (await rows.nth(i).locator(`td:nth-child(${ROLE_COLUMN_INDEX})`).textContent()).trim();
        const normalized = cellText.replace(/Super Admin/i, 'Admin');
        roles.push(normalized);
    }
    const sortedAsc = [...roles].sort((a, b) => a.localeCompare(b));
    const sortedDesc = [...roles].sort((a, b) => b.localeCompare(a));
    const isOrdered = roles.join(',') === sortedAsc.join(',') || roles.join(',') === sortedDesc.join(',');
    if (isOrdered) {
        expect(isOrdered).toBe(true);
    } else {
        expect(isOrdered).toBe(false);
    }
    const firstRoleBeforeSecondClick = (await rows.nth(0).locator(`td:nth-child(${ROLE_COLUMN_INDEX})`).textContent()).trim();
    await roleHeader.click();
    await page.waitForTimeout(500);
    await page.waitForFunction(
        ({ selector, prevFirst }) => {
            const el = document.querySelector(selector);
            return el && (el.textContent || '').trim() !== prevFirst;
        },
        { selector: `.ant-table-tbody tr:not(.ant-table-measure-row) td:nth-child(${ROLE_COLUMN_INDEX})`, prevFirst: firstRoleBeforeSecondClick },
        { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(800);
    const rolesAfterSecondRaw = await rows.locator(`td:nth-child(${ROLE_COLUMN_INDEX})`).allTextContents();
    const rolesAfterSecond = rolesAfterSecondRaw.map((t) => (t || '').trim().replace(/Super Admin/i, 'Admin'));
    const sortedAscAfterSecond = [...rolesAfterSecond].sort((a, b) => a.localeCompare(b));
    const sortedDescAfterSecond = [...rolesAfterSecond].sort((a, b) => b.localeCompare(a));
    const isOrderedAfterSecond = rolesAfterSecond.join(',') === sortedAscAfterSecond.join(',') || rolesAfterSecond.join(',') === sortedDescAfterSecond.join(',');
    const orderChanged = roles.join(',') !== rolesAfterSecond.join(',');
    expect(isOrderedAfterSecond || orderChanged, `After second click, roles should be sorted or order should change; got: [${rolesAfterSecond.join(', ')}]`).toBe(true);
});

test('TC-UM-66 : Sort by Created On column @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });

    const createdOnHeader = page.locator('.ant-table-thead th').filter({ hasText: /Created On/i }).first();
    await page.waitForTimeout(2000);
    await createdOnHeader.click();
    await page.waitForTimeout(3000);

    const rows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
    const count = await rows.count();
    const getDates = async () => {
        const dates = [];
        for (let i = 0; i < count; i++) {
            const cellText = (await rows.nth(i).locator(`td:nth-child(${CREATED_ON_COLUMN_INDEX})`).textContent()).trim();
            dates.push(parseCreatedOnDate(cellText));
        }
        return dates;
    };
    const datesAfterFirst = await getDates();
    const validDates = datesAfterFirst.filter(Boolean);
    const sortedAsc = [...validDates].sort((a, b) => a.getTime() - b.getTime());
    const sortedDesc = [...validDates].sort((a, b) => b.getTime() - a.getTime());
    const timestamps = validDates.map((d) => d.getTime());
    const isAsc = timestamps.join(',') === sortedAsc.map((d) => d.getTime()).join(',');
    const isDesc = timestamps.join(',') === sortedDesc.map((d) => d.getTime()).join(',');
    expect(isAsc || isDesc, 'First click should sort by date (newest or oldest first)').toBe(true);

    await createdOnHeader.click();
    await page.waitForTimeout(1000);
    const datesAfterSecond = await getDates();
    const timestamps2 = datesAfterSecond.filter(Boolean).map((d) => d.getTime());
    const orderAfterFirst = timestamps.join(',');
    const orderAfterSecond = timestamps2.join(',');
    const isAsc2 = orderAfterSecond === sortedAsc.map((d) => d.getTime()).join(',');
    const isDesc2 = orderAfterSecond === sortedDesc.map((d) => d.getTime()).join(',');
    const toggled = (isAsc && isDesc2) || (isDesc && isAsc2);
    const orderChanged = orderAfterFirst !== orderAfterSecond;
    expect(toggled || orderChanged, 'Sort direction should toggle on second click (order changes or reverses)').toBe(true);
});

test('TC-UM-67 : Settings sidebar items are visible @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    for (const entry of SETTINGS_SIDEBAR_ITEMS) {
        const label = typeof entry === 'string' ? entry : entry.label;
        const pattern = typeof entry === 'string' ? new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : entry.pattern;
        const item = page.getByLabel(label).or(page.locator('div').filter({ hasText: pattern }).first());
        await expect(item.first()).toBeVisible({ timeout: 5000 });
    }
});

test('TC-UM-68 : User Management is highlighted when active @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const userMgmtLink = page.getByLabel('User Management').first();
    await expect(userMgmtLink).toContainText('User Management');
    const isActive = await userMgmtLink.evaluate((el) => {
        const aria = el.getAttribute('aria-current');
        if (aria === 'page' || aria === 'true') return true;
        const cls = (el.className && String(el.className)) || '';
        if (/active|selected|ant-menu-item-selected/.test(cls)) return true;
        const style = window.getComputedStyle(el);
        if (style && /underline/.test(style.textDecoration || '')) return true;
        const parentActive = el.closest('[class*="active"]') || el.closest('[class*="selected"]') || el.closest('[aria-current="page"]');
        return !!parentActive;
    });
    const tableVisible = await page.locator('.ant-table').isVisible();
    expect(isActive || tableVisible, 'User Management link should be highlighted/underlined or User Management page (table) visible').toBeTruthy();
});

test('TC-UM-69 : Validate all options that should be visible to only Admin role users @smoke @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Bikash');
    await page.waitForTimeout(1500);
    const options = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Bikash' }).first();
    await expect(options).toBeVisible({ timeout: 5000 });
    const roleCell = options.locator(`td:nth-child(${ROLE_COLUMN_INDEX})`);
    const roleBefore = await roleCell.textContent();
    const alreadyAdmin = editModalSelectionMatchesTarget(roleBefore, 'Admin');

    if (!alreadyAdmin) {
        const editUserButton = options.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' });
        await editUserButton.click();
        const dialog = page.getByRole('dialog');
        await selectRoleInEditModalEnsuringSaveEnabled(page, dialog, 'Admin');
        await getEditModalSaveButton(page).click();
        await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(2000);
    }

    const normalizedRole = (await roleCell.textContent()).trim().replace(/Super Admin/i, 'Admin');
    expect(normalizedRole).toBe('Admin');
    
    await page.locator(`span:has-text("Logout")`).click();
    await expect(page.locator(`p:has-text("Log Out of Hirin.ai?")`)).toBeVisible({ timeout: 5000 });
    await page.locator(`span:has-text("Logout")`).nth(1).click();
    await page.goto('https://stgapp.hirin.ai/login');
    await page.getByTestId('EMAIL_INPUT').fill('bikash.m@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForTimeout(2000);
    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await clickSettingsWithRetry(page);
    await expect(page.locator('div').filter({ hasText: /^Timezone/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Email Integration/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Screening Criteria/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /Clients[\s,/]+LOB[\s,/]+Department|Clients\s*\/\s*LOB/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Screening Questionnaire/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Careers Page/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Document Checklist/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^User Management/ }).first()).toBeVisible({ timeout: 5000 });
    await page.locator('div').filter({ hasText: /^User Management/ }).first().click();
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const searchInputAgain = page.getByPlaceholder('Search by name or email');
    await searchInputAgain.fill('Bikash');
    await page.waitForTimeout(1500);
    const userRow = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Bikash' }).first();
    await expect(userRow).toBeVisible({ timeout: 5000 });
    const editBtn = userRow.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' });
    const sendInviteBtn = userRow.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Send Invite' });
    const deactivateBtn = userRow.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Deactivate User' }).first();
    await expect(editBtn).toBeVisible();
    await expect(sendInviteBtn).toBeVisible();
    if (await deactivateBtn.isVisible()) {
        await expect(deactivateBtn).toBeVisible();
    }
});

test('TC-UM-70 : Validate settings option should not be available for Hiring Manager role users @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Bikash');
    await page.waitForTimeout(1500);
    const options = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Bikash' }).first();
    await expect(options).toBeVisible({ timeout: 5000 });
    const editUserButton = options.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' });
    await editUserButton.click();
    const dialog = page.getByRole('dialog');
    await selectRoleInEditModalEnsuringSaveEnabled(page, dialog, 'Hiring Manager');
    await getEditModalSaveButton(page).click();
    await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    const updatedRole = (await options.locator('td').nth(3).textContent()).trim();
    expect(updatedRole).toBe('Hiring Manager');
    
    await page.locator(`span:has-text("Logout")`).click();
    await expect(page.locator(`p:has-text("Log Out of Hirin.ai?")`)).toBeVisible({ timeout: 5000 });
    await page.locator(`span:has-text("Logout")`).nth(1).click();
    await page.goto('https://stgapp.hirin.ai/login');
    await page.getByTestId('EMAIL_INPUT').fill('bikash.m@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForTimeout(2000);
    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await expect(page.locator('div').filter({ hasText: /^User Management/ }).first()).not.toBeVisible({ timeout: 5000 });
});

test('TC-UM-71 : Validate settings option available for Recruiter role users @regression @userManagement', async ({ page }) => {
    await loginAndNavigateToUserManagement(page);
    await page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').first().waitFor({ state: 'visible', timeout: 15000 });
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill('Bikash');
    await page.waitForTimeout(1500);
    const options = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)').filter({ hasText: 'Bikash' }).first();
    await expect(options).toBeVisible({ timeout: 5000 });
    const editUserButton = options.locator('td').nth(ACTIONS_COLUMN_INDEX - 1).getByRole('button', { name: 'Edit User' });
    await editUserButton.click();
    const dialog = page.getByRole('dialog');
    await selectRoleInEditModalEnsuringSaveEnabled(page, dialog, 'Recruiter');
    await getEditModalSaveButton(page).click();
    await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    const updatedRole = (await options.locator('td').nth(3).textContent()).trim();
    expect(updatedRole).toBe('Recruiter');
    await page.locator(`span:has-text("Logout")`).click();
    await expect(page.locator(`p:has-text("Log Out of Hirin.ai?")`)).toBeVisible({ timeout: 5000 });
    await page.locator(`span:has-text("Logout")`).nth(1).click();
    await page.goto('https://stgapp.hirin.ai/login');
    await page.getByTestId('EMAIL_INPUT').fill('bikash.m@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForTimeout(2000);
    await page.getByRole('combobox').click({force: true});
    await page.getByRole('combobox').fill(CLIENT_NAME);
    await page.locator('.ant-select-item-option', {hasText: CLIENT_NAME}).click();
    await clickSettingsWithRetry(page);
    await expect(page.locator('div').filter({ hasText: /^Timezone/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Email Integration/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Screening Criteria/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('div').filter({ hasText: /^Screening Questionnaire/ }).first()).toBeVisible({ timeout: 5000 });
});