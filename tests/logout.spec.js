const { test, expect } = require('@playwright/test');

test('Logout @smoke @regression @logout', async ({ page }) => {
    await page.goto('https://stgapp.hirin.ai/login');
    await page.getByTestId('EMAIL_INPUT').fill('superadmin@yopmail.com');
    await page.getByTestId('PASSWORD_INPUT').fill('Test@1234');
    await page.getByTestId('LOGIN_BTN').click();
    await page.waitForURL(/growexx-stg\.hirin\.ai\/(?!login).*/, { timeout: 15000 });
    const logoutIcon = page.getByAltText('logout-icon');
    await expect(logoutIcon).toBeVisible({ timeout: 10000 });
    await logoutIcon.click();
    await expect(page.locator(`p:has-text("Log Out of Hirin.ai?")`)).toBeVisible();
    await page.locator(`span:has-text("Logout")`).nth(1).click();
    await expect(page.getByText('Login'),{ timeout: 10000 }).toBeVisible();
});